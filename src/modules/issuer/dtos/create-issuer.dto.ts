// src/modules/issuer/dtos/create-issuer.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateIssuerDto {
  @IsString()
  @IsNotEmpty()
  domain!: string

  @IsString()
  @IsOptional()
  organization?: string

  @IsString()
  @IsOptional()
  description?: string
}
