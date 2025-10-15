// src/modules/issuer/controllers/issuer.controller.ts
import { Body, Controller, Post, Param } from '@nestjs/common'
import { IssuerService } from '../services/issuer.service'
import { CreateIssuerDto } from '../dtos/create-issuer.dto'
import { IssueCredentialDto } from '../dtos/issue-credential.dto'
import { RequestCredentialDto } from '../dtos/request-credential.dto'

@Controller('issuer')
export class IssuerController {
  constructor(private readonly issuerService: IssuerService) {}

  /**
   * Create a new issuer DID (did:web)
   * Example: POST /issuer/did
   * { "domain": "localhost:3333" }
   */
  @Post('did')
  async createIssuer(@Body() body: CreateIssuerDto) {
    return this.issuerService.createIssuer(
      body.domain,
      body.organization,
      body.description,
    )
  }

  @Post('request-credential')
  async requestCredential(@Body() body: RequestCredentialDto) {
    return this.issuerService.requestCredential(body)
  }

  @Post('issue-credential/:requestId')
  async issueCredential(@Param('requestId') requestId: string) {
    return this.issuerService.issueCredentialFromRequest(requestId)
  }

}
