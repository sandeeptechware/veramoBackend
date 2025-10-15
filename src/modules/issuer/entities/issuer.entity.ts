import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Issuer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  did: string;

  // Public JWK in JSON form
  @Column('simple-json')
  publicJwk: Record<string, any>;

  //Private JWK in JSON form (encrypt in production)
  @Column('simple-json', { nullable: true })
  privateJwk: Record<string, any>;

  @Column({ nullable: true })
  organization?: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;
}
