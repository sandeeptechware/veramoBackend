// src/modules/veramo/veramo.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { agent } from './veramo.config'

@Injectable()
export class VeramoService {
    private readonly logger = new Logger(VeramoService.name)

    async createDid(provider: 'did:web' | 'did:key', domainOrAlias?: string) {
        console.log(`🚀 [VeramoService] Creating DID with method=${provider}, domain=${domainOrAlias}`);
        const alias = provider === 'did:web' ? domainOrAlias : undefined
        const identifier = await agent.didManagerCreate({
            provider,
            alias,
            options: provider === 'did:web' ? { keyType: 'Ed25519', domain: domainOrAlias } : {}
        })
        this.logger.log(`✅ Created DID: ${identifier.did}`)
        return identifier
    }

    async listDids() {
        return await agent.didManagerFind()
    }

    async issueCredential(issuerDid: string, subjectDid: string, claims: any) {
        const vc = await agent.createVerifiableCredential({
            credential: {
                issuer: { id: issuerDid },
                credentialSubject: { id: subjectDid, ...claims },
            },
            proofFormat: 'jwt',
        })
        return vc
    }

    async verifyCredential(vcJwt: string) {
        return await agent.verifyCredential({ credential: vcJwt })
    }

    async resolveDid(did: string) {
        try {
            const result = await agent.resolveDid({ didUrl: did });
            return result;
        } catch (error) {
            this.logger.error(`❌ Failed to resolve DID ${did}: ${error.message}`);
            throw error;
        }
    }

}
