// src/modules/issuer/services/issuer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Issuer } from '../entities/issuer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { generateKeyPair, exportJWK, importJWK, CompactSign, CompactEncrypt } from 'jose';
import { VeramoService } from '../../veramo/veramo.service';
import { CredentialRequest } from '../entities/credential-request.entity';
import { RequestCredentialDto } from '../dtos/request-credential.dto';


@Injectable()
export class IssuerService {
    private readonly logger = new Logger(IssuerService.name);

    constructor(
        @InjectRepository(Issuer)
        private issuerRepo: Repository<Issuer>,
        private readonly veramoService: VeramoService,

        @InjectRepository(CredentialRequest)
        private credentialRequestRepo: Repository<CredentialRequest>,
    ) { }

    // create issuer with Ed25519 key and DID:web domain
    async createIssuer(domain: string, organization?: string, description?: string) {
        try {
            // Step 1: Create DID via Veramo
            const identifier = await this.veramoService.createDid('did:web', domain)
            this.logger.log(`✅ Created issuer DID: ${identifier.did}`)

            // Step 2: Check if already exists
            const existing = await this.issuerRepo.findOne({ where: { did: identifier.did } })
            if (existing) {
                this.logger.warn(`Issuer DID already exists: ${identifier.did}`)
                return { message: 'Issuer exists', did: identifier.did, id: existing.id }
            }

            // Step 3: Extract keys
            const key = identifier.keys?.[0]
            const publicKeyHex = key?.publicKeyHex || null
            // const privateKeyHex = key?.privateKeyHex || null

            // Step 4: Save to DB
            const issuer = this.issuerRepo.create({
                did: identifier.did,
                publicJwk: { publicKeyHex },
                organization,
                description,
            })
            await this.issuerRepo.save(issuer)
            console.log('issuer created: ', issuer);

            // Step 5: Return DID + DID Document URL
            const didDocumentUrl = `http://${domain}/.well-known/did.json`
            return {
                message: 'Issuer created successfully',
                did: issuer.did,
                didDocumentUrl,
                organization,
                description
            }

        } catch (error) {
            this.logger.warn(`error in creating DID: ${error.message}`)
        }
    }


    // Get DID Document (for /.well-known/did.json)
    async getDidDocumentByDomain(domain: string) {
        const didHostForId = domain.replace(/:/g, '%3A');
        const did = `did:web:${didHostForId}`;
        const issuer = await this.issuerRepo.findOne({ where: { did } });
        if (!issuer) return null;

        const verificationMethodId = `${did}#${issuer.id}-key-1`;
        const doc = {
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
        return doc;
    }

    async requestCredential(dto: RequestCredentialDto) {
        try {
            const newRequest = this.credentialRequestRepo.create({
                subjectDid: dto.subjectDid,
                credentialType: dto.credentialType,
                claims: dto.claims,
                holderKeyJwk: dto.holderKeyJwk,
                status: 'pending',
            })
            await this.credentialRequestRepo.save(newRequest)
            this.logger.log(`📥 New credential request: ${newRequest.id}`)
            return {
                message: 'Credential request submitted successfully',
                requestId: newRequest.id,
                status: newRequest.status,
            }
        } catch (error) {
            this.logger.error(`❌ Failed to create credential request: ${error.message}`)
            throw error
        }
    }

    async issueCredentialFromRequest(requestId: string) {
        // 1️⃣ Fetch the credential request
        const request = await this.credentialRequestRepo.findOne({
            where: { id: requestId },
        })
        if (!request) throw new Error('Credential request not found')

        if (request.status === 'issued') {
            return { message: 'This credential has already been issued' }
        }

        // 2️⃣ Fetch the issuer DID and private key
        const issuer = await this.issuerRepo.findOne({
            order: { createdAt: 'ASC' },
        })
        if (!issuer) throw new Error('No issuer found in database')

        // 3️⃣ Build the Verifiable Credential payload
        const vc = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            id: `urn:uuid:${this.randomUuid()}`,
            type: ['VerifiableCredential', request.credentialType],
            issuer: issuer.did,
            issuanceDate: new Date().toISOString(),
            credentialSubject: request.claims,
        }

        // 4️⃣ Import issuer private key (Ed25519)
        const privateJwk = issuer.privateJwk
        if (!privateJwk || !privateJwk.d) {
            throw new Error('Issuer private key missing')
        }
        const issuerPrivateKey = await importJWK(privateJwk, 'EdDSA')

        // 5️⃣ Sign the VC as a JWS (Compact)
        const jws = await new CompactSign(Buffer.from(JSON.stringify(vc)))
            .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
            .sign(issuerPrivateKey)

        // 6️⃣ Encrypt for holder using holder’s public key (X25519)
        const holderPublicKeyJwk = request.holderKeyJwk
        if (!holderPublicKeyJwk || holderPublicKeyJwk.crv !== 'X25519') {
            throw new Error('Holder public key must be X25519 JWK')
        }
        const holderKey = await importJWK(holderPublicKeyJwk, 'ECDH-ES')

        const jwe = await new CompactEncrypt(Buffer.from(jws))
            .setProtectedHeader({ alg: 'ECDH-ES+A256KW', enc: 'A256GCM' })
            .encrypt(holderKey)

        // 7️⃣ Update the credential request as issued
        request.status = 'issued'
        request.issuedAt = new Date()
        await this.credentialRequestRepo.save(request)

        // 8️⃣ Return the issued VC (JWE) to holder
        return {
            message: 'Credential successfully issued and encrypted for holder',
            requestId,
            issuerDid: issuer.did,
            subjectDid: request.subjectDid,
            jwe, // Encrypted signed credential
        }
    }

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

    private randomUuid() {
        // simple UUID v4 (not cryptographically perfect; fine for demo)
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
}
