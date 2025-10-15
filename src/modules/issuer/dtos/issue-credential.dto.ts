// src/modules/issuer/dtos/issue-credential.dto.ts
import { IsString, IsObject, IsNotEmpty, IsOptional } from 'class-validator'

export class IssueCredentialDto {
  @IsString()
  @IsNotEmpty()
  issuerDid: string

  @IsString()
  @IsNotEmpty()
  holderDid!: string;

  // holder's public key JWK for encryption (X25519)
  @IsObject()
  holderKeyJwk!: any;

  // arbitrary credentialSubject object
  @IsObject()
  credentialSubject!: any;

  @IsString()
  @IsNotEmpty()
  subjectDid: string

  @IsObject()
  @IsNotEmpty()
  claims: Record<string, any>

  @IsString()
  @IsOptional()
  type?: string // e.g. 'EmployeeCredential', 'AccessCredential'

  @IsString()
  @IsOptional()
  expirationDate?: string // ISO date string if applicable
}
