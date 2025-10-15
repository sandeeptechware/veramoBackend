// src/modules/issuer/dtos/request-credential.dto.ts
import { IsString, IsNotEmpty, IsObject } from 'class-validator'

export class RequestCredentialDto {
  @IsString()
  @IsNotEmpty()
  subjectDid!: string

  @IsString()
  @IsNotEmpty()
  credentialType: string

  @IsObject()
  @IsNotEmpty()
  claims: Record<string, any>

  //Holder’s public key JWK for encryption
  @IsObject()
  @IsNotEmpty()
  holderKeyJwk: any
}
