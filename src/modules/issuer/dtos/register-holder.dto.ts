import { IsString, IsNotEmpty } from 'class-validator'

export class RegisterHolderDto {
  @IsString()
  @IsNotEmpty()
  caseId!: string

  @IsString()
  @IsNotEmpty()
  holderDid!: string
}
