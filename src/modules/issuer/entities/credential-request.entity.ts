// src/modules/issuer/entities/credential-request.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('credential_request')
export class CredentialRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // Unique case linking Verifier → Issuer → Holder
  @Column({ unique: true })
  caseId: string

  @Column({ nullable: true })
  subjectDid?: string

  @Column()
  credentialType: string

  @Column('simple-json')
  claims: Record<string, any>

  // ✅ Holder’s public key (X25519 JWK)
  @Column('simple-json', { nullable: true })
  holderKeyJwk?: Record<string, any>

  @Column({ default: 'pending_holder' })
  status: 'pending_holder' | 'holder_ready' | 'issued' | 'rejected' | 'shared_with_verifier' | 'verified'

  // ✅ Timestamp when the credential was issued
  @Column({ type: 'datetime', nullable: true })
  issuedAt?: Date

  @CreateDateColumn()
  createdAt: Date
}
