// src/modules/veramo/veramo.config.ts
import { createAgent, IDIDManager, IKeyManager, IDataStore, IDataStoreORM, IResolver, ICredentialIssuer, } from '@veramo/core'
import { KeyManager } from '@veramo/key-manager'
import { DIDManager } from '@veramo/did-manager'
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { WebDIDProvider } from '@veramo/did-provider-web'
import { KeyDIDProvider, getDidKeyResolver } from '@veramo/did-provider-key'
import { CredentialPlugin } from '@veramo/credential-w3c'
import { getResolver as webDidResolver } from 'web-did-resolver'
import { DataSource } from 'typeorm'
import { Entities, KeyStore, DIDStore, PrivateKeyStore, DataStore, DataStoreORM, } from '@veramo/data-store'
import { Resolver } from 'did-resolver'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// ✅ Ensure /data folder exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir)
    console.log('📁 Created data folder at', dataDir)
}

// ✅ Persistent SQLite DB
export const dbConnection = new DataSource({
    type: 'sqlite',
    database: './data/veramo.sqlite',
    synchronize: true,
    entities: Entities,
})

    // ✅ Initialize inside async IIFE
    ; (async () => {
        try {
            await dbConnection.initialize()
            console.log('✅ Veramo SQLite database connected!')
        } catch (error) {
            console.error('❌ Veramo DB connection failed:', error)
        }
    })()

const secretKey =
    process.env.VERAMO_SECRET_KEY ||
    crypto.createHash('sha256').update('my-secret-password').digest('hex')

// ✅ Create Veramo agent
export const agent = createAgent<IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver & ICredentialIssuer>({
    plugins: [
        new KeyManager({
            store: new KeyStore(dbConnection),
            kms: {
                local: new KeyManagementSystem(
                    new PrivateKeyStore(
                        dbConnection,
                        new SecretBox(secretKey)
                    )
                ),
            },
        }),
        new DIDManager({
            store: new DIDStore(dbConnection),
            defaultProvider: 'did:key',
            providers: {
                'did:web': new WebDIDProvider({ defaultKms: 'local' }),
                'did:key': new KeyDIDProvider({ defaultKms: 'local' }),
            },
        }),
        new DataStore(dbConnection),
        new DataStoreORM(dbConnection),
        new CredentialPlugin(),
        new DIDResolverPlugin({
            resolver: new Resolver({
                ...webDidResolver(),
                ...getDidKeyResolver(),
            }),
        }),
    ],
})
