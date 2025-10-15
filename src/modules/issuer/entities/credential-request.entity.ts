// src/modules/issuer/entities/credential-request.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity()
export class CredentialRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  subjectDid: string

  @Column()
  credentialType: string

  @Column('simple-json')
  claims: Record<string, any>

  // ✅ Holder’s public key (X25519 JWK)
  @Column('simple-json', { nullable: true })
  holderKeyJwk?: Record<string, any>

  @Column({ default: 'pending' })
  status: 'pending' | 'approved' | 'rejected' | 'issued'

  // ✅ Timestamp when the credential was issued
  @Column({ type: 'datetime', nullable: true })
  issuedAt?: Date

  @CreateDateColumn()
  createdAt: Date
}
