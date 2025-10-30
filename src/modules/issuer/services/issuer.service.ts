// src/modules/issuer/services/issuer.service.ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { Issuer } from '../entities/issuer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { generateKeyPair, exportJWK, importJWK, CompactSign, CompactEncrypt } from 'jose';
// import { VeramoService } from '../../veramo/veramo.service';
import { CredentialRequest } from '../entities/credential-request.entity';
// import { RequestCredentialDto } from '../dtos/request-credential.dto';
import { agent } from '../../veramo/veramo.config';


@Injectable()
export class IssuerService {
    private readonly logger = new Logger(IssuerService.name);

    constructor(
        @InjectRepository(Issuer)
        private readonly issuerRepo: Repository<Issuer>,
        // private readonly veramoService: VeramoService,

        @InjectRepository(CredentialRequest)
        private readonly credentialRequestRepo: Repository<CredentialRequest>,
    ) { }

    // create issuer with Ed25519 key and DID:web domain
    async createIssuer(domain: string, organization?: string, description?: string) {
        // try {
        //     // Step 1: Create DID via Veramo
        //     const identifier = await this.veramoService.createDid('did:web', domain)
        //     this.logger.log(`✅ Created issuer DID: ${identifier.did}`)

        //     // Step 2: Check if already exists
        //     const existing = await this.issuerRepo.findOne({ where: { did: identifier.did } })
        //     if (existing) {
        //         this.logger.warn(`Issuer DID already exists: ${identifier.did}`)
        //         return { message: 'Issuer exists', did: identifier.did, id: existing.id }
        //     }

        //     // Step 3: Extract keys
        //     const key = identifier.keys?.[0]
        //     const publicKeyHex = key?.publicKeyHex || null
        //     // const privateKeyHex = key?.privateKeyHex || null

        //     // Step 4: Save to DB
        //     const issuer = this.issuerRepo.create({
        //         did: identifier.did,
        //         publicJwk: { publicKeyHex },
        //         organization,
        //         description,
        //     })
        //     await this.issuerRepo.save(issuer)
        //     console.log('issuer created: ', issuer);

        //     // Step 5: Return DID + DID Document URL
        //     const didDocumentUrl = `http://${domain}/.well-known/did.json`
        //     return {
        //         message: 'Issuer created successfully',
        //         did: issuer.did,
        //         didDocumentUrl,
        //         organization,
        //         description
        //     }

        // } catch (error) {
        //     this.logger.warn(`error in creating DID: ${error.message}`)
        // }

        try {
            console.log('first');
            const identifier = await agent.didManagerCreate({
                provider: 'did:web',
                alias: domain,
                options: { keyType: 'Ed25519', domain: domain }
            });
            console.log('second');
            this.logger.log(`created issuer DID: ${identifier.did}`);

            const existing = await this.issuerRepo.findOne({ where: { did: identifier.did } })
            if (existing) {
                this.logger.warn(`issuer DID already exists: ${identifier.did}`);
                return existing
            }

            const publicKey = identifier.keys[0]?.publicKeyHex
            const privateKey = identifier.keys[0]?.privateKeyHex

            const issuer = this.issuerRepo.create({
                did: identifier.did,
                publicJwk: { kty: 'OKP', crv: 'Ed25519', x: publicKey },
                privateJwk: { kty: 'OKP', crv: 'Ed25519', x: publicKey, d: privateKey },
                organization,
                description,
            })

            await this.issuerRepo.save(issuer)
            this.logger.log(`✅ Issuer saved to DB with ID: ${issuer.id}`);

            return issuer
        } catch (error) {
            this.logger.error(`❌ Failed to create issuer: ${error.message}`);
            throw error;
        }
    }


    // Get DID Document (for verifier)
    async getDidDocumentByDomain(domain: string) {
        const didHostForId = domain.replace(/:/g, '%3A');
        const did = `did:web:${didHostForId}`;
        const issuer = await this.issuerRepo.findOne({ where: { did } });
        if (!issuer) return null;

        const verificationMethodId = `${did}#${issuer.id}-key-1`;
        return {
            '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
            id: did,
            verificationMethod: [
                {
                    id: verificationMethodId,
                    type: 'JsonWebKey2020',
                    controller: did,
                    publicKeyJwk: issuer.publicJwk,
                },
            ],
            authentication: [verificationMethodId],
            assertionMethod: [verificationMethodId],
        };
    }

    async createCredentialRequest(caseId: string, credentialType: string, claims: Record<string, any>) {
        try {
            const newRequest = this.credentialRequestRepo.create({
                caseId,
                credentialType,
                claims,
                status: "pending_holder",
            });
            await this.credentialRequestRepo.save(newRequest);
            this.logger.log(`created credential request for caseId: ${caseId}`)
            return newRequest;
        } catch (error) {
            this.logger.error(`❌ Failed to create credential request: ${error.message}`);
            throw error;
        }
    }

    // async requestCredential(dto: RequestCredentialDto) {
    //     try {
    //         this.logger.log(`📨 Received VC request: ${JSON.stringify(dto, null, 2)}`);

    //         // 🧩 Resolve holder DID to get publicKeyJwk
    //         const holderResolution = await this.veramoService.resolveDid(dto.subjectDid);
    //         if (!holderResolution || !holderResolution.didDocument) {
    //             throw new Error(`Failed to resolve DID: ${dto.subjectDid}`);
    //         }

    //         const verificationMethod = holderResolution.didDocument.verificationMethod?.[0];
    //         const holderKeyJwk = verificationMethod?.publicKeyJwk;

    //         if (!holderKeyJwk) {
    //             throw new Error(`No publicKeyJwk found in DID Document for ${dto.subjectDid}`);
    //         }

    //         this.logger.log(`🔑 Resolved holder key: ${JSON.stringify(holderKeyJwk)}`);

    //         // create and save request in DB
    //         const newRequest = this.credentialRequestRepo.create({
    //             subjectDid: dto.subjectDid,
    //             credentialType: dto.credentialType,
    //             claims: dto.claims,
    //             status: 'pending',
    //         })
    //         await this.credentialRequestRepo.save(newRequest)

    //         this.logger.log(`📥 New credential request: ${newRequest.id}`)
    //         return {
    //             message: 'Credential request submitted successfully',
    //             requestId: newRequest.id,
    //             status: newRequest.status,
    //         }
    //     } catch (error) {
    //         this.logger.error(`❌ Failed to create credential request: ${error.message}`)
    //         throw error
    //     }
    // }

    /* Get Credential Requests for Holder - not needed for current workflow */
    async getRequestsForHolder(holderDid: string) {
        const requests = await this.credentialRequestRepo.find({
            where: { subjectDid: holderDid },
            order: { createdAt: 'DESC' },
        });

        return requests.map(r => ({
            id: r.id,
            credentialType: r.credentialType,
            status: r.status,
            issuedAt: r.issuedAt,
        }));
    }

    //Holder Registers (links DID to caseId)
    async registerHolder(caseId: string, holderDid: string) {
        try {
            const request = await this.credentialRequestRepo.findOne({ where: { caseId } })
            if (!request) throw new Error(`Credential request not found for caseId ${caseId}`)

            request.subjectDid = holderDid
            request.status = 'holder_ready'
            await this.credentialRequestRepo.save(request)

            this.logger.log(`👤 Holder registered for caseId: ${caseId}`)
            return { message: 'Holder registered successfully', caseId, holderDid }
        } catch (error) {
            this.logger.error(`❌ Failed to register holder: ${error.message}`);
            throw error;
        }
    }

    //Issue Credential (JWE returned directly to Holder)
    async issueCredentialForCase(caseId: string) {
        try {
            const request = await this.credentialRequestRepo.findOne({ where: { caseId } })
            if (!request) throw new Error(`Credential request not found for caseId: ${caseId}`)

            const issuer = await this.issuerRepo.findOne({ order: { createdAt: 'ASC' } })
            if (!issuer) throw new Error('Issuer not configured')

            // 🧩 Build VC
            const issuanceDate = new Date().toISOString()
            const expirationDate = new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString()

            const vc = {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                id: `urn:uuid:${this.randomUuid()}`,
                type: ['VerifiableCredential', request.credentialType],
                issuer: issuer.did,
                issuanceDate,
                expirationDate,
                credentialSubject: {
                    id: request.subjectDid,
                    ...request.claims,
                },
            }

            // 🧩 Import Issuer Private Key
            const privateJwk = issuer.privateJwk
            const issuerPrivateKey = await importJWK(privateJwk, 'EdDSA')

            // 🧩 Sign VC → JWS
            const jws = await new CompactSign(Buffer.from(JSON.stringify(vc)))
                .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
                .sign(issuerPrivateKey)

            // 🧩 Resolve Holder DID to get Public Key
            console.log(`🔍 Resolving holder DID: ${request.subjectDid}`)
            const resolved = await agent.resolveDid({ didUrl: request.subjectDid })
            const holderDoc = resolved.didDocument

            if (!holderDoc || !holderDoc.verificationMethod?.length) {
                throw new Error(`Failed to resolve holder DID Document: ${request.subjectDid}`)
            }

            // Prefer X25519 key for encryption, fallback to first available
            const holderKeyEntry =
                holderDoc.verificationMethod.find((v: any) => v.publicKeyJwk?.crv === 'X25519') ||
                holderDoc.verificationMethod[0]

            if (!holderKeyEntry?.publicKeyJwk) {
                throw new Error(`No suitable publicKeyJwk found for holder DID: ${request.subjectDid}`)
            }

            const holderPublicKeyJwk = holderKeyEntry.publicKeyJwk
            console.log('✅ Holder Public Key (resolved):', holderPublicKeyJwk)

            // 🧩 Encrypt for Holder
            const holderKey = await importJWK(holderPublicKeyJwk, 'ECDH-ES')
            const jwe = await new CompactEncrypt(Buffer.from(jws))
                .setProtectedHeader({ alg: 'ECDH-ES+A256KW', enc: 'A256GCM' })
                .encrypt(holderKey)

            request.status = 'issued'
            request.issuedAt = new Date()
            await this.credentialRequestRepo.save(request)

            return {
                message: `Credential issued for caseId: ${caseId}`,
                jwe,
                subjectDid: request.subjectDid,
            }
        } catch (error) {
            this.logger.error(`❌ Failed to issue credential: ${error.message}`)
            throw error;
        }
    }

    // async issueCredentialFromRequest(requestId: string) {
    //     console.log('requestId in table: ', requestId);
    //     // 1️⃣ Fetch the credential request
    //     const request = await this.credentialRequestRepo.findOne({
    //         where: { id: requestId },
    //     })
    //     console.log('request response: ', request);
    //     if (!request) throw new Error('Credential request not found')

    //     if (request.status === 'issued') {
    //         return { message: 'This credential has already been issued' }
    //     }

    //     // 2️⃣ Fetch the issuer DID and private key
    //     const issuer = await this.issuerRepo.findOne({
    //         order: { createdAt: 'ASC' },
    //     })
    //     if (!issuer) throw new Error('No issuer found in database')
    //     if (!issuer.privateJwk || !issuer.privateJwk.d) {
    //         throw new Error('Issuer private key missing');
    //     }

    //     // 3️⃣ Build the Verifiable Credential payload
    //     const issuanceDate = new Date().toISOString();
    //     const expirationDate = new Date(
    //         new Date().setFullYear(new Date().getFullYear() + 5)
    //     ).toISOString();
    //     const vc = {
    //         '@context': [
    //             'https://www.w3.org/2018/credentials/v1',
    //             'https://schema.org',
    //             {
    //                 ExperienceCredential: 'https://example.com/credentials/experience',
    //                 employee: 'https://schema.org/Person',
    //                 employer: 'https://schema.org/Organization',
    //                 jobTitle: 'https://schema.org/jobTitle',
    //                 startDate: 'https://schema.org/startDate',
    //                 endDate: 'https://schema.org/endDate',
    //                 employmentType: 'https://schema.org/employmentType',
    //                 experienceSummary: 'https://schema.org/description',
    //             },
    //         ],
    //         id: `urn:uuid:${this.randomUuid()}`,
    //         type: ['VerifiableCredential', request.credentialType],
    //         issuer: {
    //             id: issuer.did,
    //             name: issuer.organization || 'Yaatra Inc.',
    //             url: `https://${issuer.did.replace('did:web:', '')}`,
    //         },
    //         issuanceDate,
    //         expirationDate,
    //         credentialSubject: {
    //             id: request.subjectDid,
    //             employee: {
    //                 name: request.claims?.name || 'Unknown',
    //                 email: request.claims?.email || 'employee@company.com',
    //             },
    //             employer: {
    //                 name: issuer.organization || 'Yaatra Inc.',
    //                 address: request.claims?.address || 'Company HQ',
    //             },
    //             jobTitle: request.claims?.position || 'Employee',
    //             employmentType: request.claims?.employmentType || 'Full-time',
    //             startDate: request.claims?.startDate || '2021-01-01',
    //             endDate: request.claims?.endDate || new Date().toISOString().split('T')[0],
    //             experienceSummary:
    //                 request.claims?.experienceSummary ||
    //                 `Served as ${request.claims?.position || 'Employee'} in ${issuer.organization || 'Company'
    //                 } contributing to projects and development initiatives.`,
    //         },
    //     }

    //     // 4️⃣ Import issuer private key (Ed25519)
    //     const privateJwk = issuer.privateJwk
    //     if (!privateJwk) {
    //         throw new Error('Issuer private key missing')
    //     }
    //     const issuerPrivateKey = await importJWK(privateJwk, 'EdDSA')

    //     // 5️⃣ Sign the VC as a JWS (Compact)
    //     const jws = await new CompactSign(Buffer.from(JSON.stringify(vc)))
    //         .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
    //         .sign(issuerPrivateKey)


    //     // 6️⃣ Encrypt for holder using holder’s public key (X25519)
    //     let holderPublicKeyJwk = request.holderKeyJwk
    //     if (!holderPublicKeyJwk) {
    //         console.log(`Resolving holder DID: ${request.subjectDid}`);
    //         const resolved = await agent.resolveDid({ didUrl: request.subjectDid });
    //         const holderDoc = resolved.didDocument;

    //         if (!holderDoc || !holderDoc.verificationMethod?.length) {
    //             throw new Error(`Failed to resolve holder DID Document: ${request.subjectDid}`);
    //         };

    //         const key = holderDoc.verificationMethod.find(
    //             (v: any) => v.publicKeyJwk?.crv === 'X25519'
    //         ) || holderDoc.verificationMethod[0];

    //         if (!key || !key.publicKeyJwk) {
    //             throw new Error(`No suitable publicKeyJwk found for holder DID: ${request.subjectDid}`);
    //         }

    //         holderPublicKeyJwk = key.publicKeyJwk;
    //         console.log('✅ Resolved holder public key JWK:', holderPublicKeyJwk);
    //     }

    //     if (holderPublicKeyJwk.crv !== 'X25519') {
    //         throw new Error('Holder public key must be X25519 JWK')
    //     }

    //     const holderKey = await importJWK(holderPublicKeyJwk, 'ECDH-ES')

    //     const jwe = await new CompactEncrypt(Buffer.from(jws))
    //         .setProtectedHeader({ alg: 'ECDH-ES+A256KW', enc: 'A256GCM' })
    //         .encrypt(holderKey)

    //     // 7️⃣ Update the credential request as issued
    //     request.status = 'issued'
    //     request.issuedAt = new Date()
    //     await this.credentialRequestRepo.save(request)

    //     // 8️⃣ Return the issued VC (JWE) to holder
    //     return {
    //         message: 'Credential successfully issued and encrypted for holder',
    //         requestId,
    //         issuerDid: issuer.did,
    //         subjectDid: request.subjectDid,
    //         jwe, // Encrypted signed credential
    //     }
    // }

    // issue credential: sign with Ed25519 issuer private key -> returns JWS compact
    // then encrypt JWS compact as JWE to the holder's X25519 public key (holderJwk)
    // async issueCredential(dto: { holderDid: string; holderKeyJwk: any; credentialSubject: any }) {
    //     const { holderDid, holderKeyJwk, credentialSubject } = dto;

    //     // Fetch the first issuer (sorted by createdAt ascending; optional sorting)
    //     const issuer = await this.issuerRepo.findOne({
    //         order: { createdAt: 'ASC' }, // Adjust sorting (e.g., 'DESC' for newest) if needed
    //     });

    //     if (!issuer) throw new Error('No issuer configured. Create issuer first.');

    //     // Build Verifiable Credential (VC)
    //     const vc = {
    //         '@context': ['https://www.w3.org/2018/credentials/v1'],
    //         id: `urn:uuid:${this.randomUuid()}`,
    //         type: ['VerifiableCredential', 'ExampleCredential'],
    //         issuer: issuer.did,
    //         issuanceDate: new Date().toISOString(),
    //         credentialSubject,
    //     };

    //     // Import issuer private key (Ed25519)
    //     const issuerPrivateKey = await importJWK(issuer.privateJwk, 'EdDSA');

    //     // Sign the VC to produce a JWS compact string
    //     const payload = JSON.stringify(vc);
    //     const jws = await new CompactSign(Buffer.from(payload))
    //         .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
    //         .sign(issuerPrivateKey);

    //     // Validate holder's JWK (X25519 public key)
    //     if (!holderKeyJwk || holderKeyJwk.crv !== 'X25519') {
    //         throw new Error('Holder key JWK must be X25519 public key (crv: X25519).');
    //     }

    //     // Import holder's public key for encryption
    //     const holderPublicKey = await importJWK(holderKeyJwk, 'ECDH-ES');

    //     // Encrypt the JWS compact string to produce a JWE
    //     const jwe = await new CompactEncrypt(Buffer.from(jws))
    //         .setProtectedHeader({ alg: 'ECDH-ES+A256KW', enc: 'A256GCM' })
    //         .encrypt(holderPublicKey);

    //     return {
    //         jwe,
    //         issuerDid: issuer.did,
    //         holderDid,
    //         issuanceDate: vc.issuanceDate,
    //     };
    // }

    async getCaseStatus(caseId: string) {
        const request = await this.credentialRequestRepo.findOne({ where: { caseId } })
        if (!request) throw new Error(`No case found for caseId: ${caseId}`)
        return { caseId, status: request.status, issuedAt: request.issuedAt }
    }


    private randomUuid() {
        // simple UUID v4 (not cryptographically perfect; fine for demo)
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
}
