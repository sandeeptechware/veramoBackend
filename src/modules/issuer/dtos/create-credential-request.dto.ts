import { IsString, IsNotEmpty, IsObject } from 'class-validator'

export class CreateCredentialRequestDto {
    @IsString()
    @IsNotEmpty()
    caseId: string;

    @IsString()
    @IsNotEmpty()
    credentialType: string;

    @IsObject()
    @IsNotEmpty()
    claims: Record<string, any>;
}