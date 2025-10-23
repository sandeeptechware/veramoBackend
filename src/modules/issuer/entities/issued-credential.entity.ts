import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm'

@Entity()
export class IssuedCredential {
  @PrimaryColumn('text')
  id: string

  @Column()
  subjectDid: string

  @Column()
  credentialType: string

  @Column('simple-json')
  claims: Record<string, any>

  @Column('simple-json', { nullable: true })
  holderKeyJwk?: Record<string, any>

  @Column({ default: 'issued' })
  status: 'issued'

  @CreateDateColumn()
  createdAt: Date
}
