// src/modules/issuer/controllers/issuer.controller.ts
import { Body, Controller, Post, Get, Param, Logger } from '@nestjs/common'
import { IssuerService } from '../services/issuer.service'
import { CreateIssuerDto } from '../dtos/create-issuer.dto'
import { IssueCredentialDto } from '../dtos/issue-credential.dto'
import { RequestCredentialDto } from '../dtos/request-credential.dto'

@Controller('issuer')
export class IssuerController {
  private readonly logger = new Logger(IssuerController.name);
  constructor(private readonly issuerService: IssuerService) { }

  @Post('ping')
  ping(@Body() body: any) {
    console.log('📩 /issuer/ping body:', body);
    return { message: 'pong', received: body };
  }

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
    this.logger.log(`📨 Received VC request: ${JSON.stringify(body, null, 2)}`);
    return this.issuerService.requestCredential(body)
  }

  @Get('requests/:holderDid')
  async getRequestsForHolder(@Param('holderDid') holderDid: string) {
    console.log('📥 holderDid param:', holderDid);
    return this.issuerService.getRequestsForHolder(holderDid);
  }


  @Get('issue-credential/:requestId')
  async issueCredential(@Param('requestId') requestId: string) {
    return this.issuerService.issueCredentialFromRequest(requestId)
  }

}
