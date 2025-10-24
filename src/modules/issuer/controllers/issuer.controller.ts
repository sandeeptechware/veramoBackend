// src/modules/issuer/controllers/issuer.controller.ts
import { Body, Controller, Post, Get, Param, Logger, Query } from '@nestjs/common'
import { IssuerService } from '../services/issuer.service'
import { CreateIssuerDto } from '../dtos/create-issuer.dto'
import { RequestCredentialDto } from '../dtos/request-credential.dto'
import { CreateCredentialRequestDto } from '../dtos/create-credential-request.dto'

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
  // @Post('did')
  // async createIssuer(@Body() body: CreateIssuerDto) {
  //   return this.issuerService.createIssuer(
  //     body.domain,
  //     body.organization,
  //     body.description,
  //   )
  // }

  @Post('create-issuer-did')
  async createIssuer(
    @Body() body: CreateIssuerDto
  ) {
    this.logger.log(`🌐 Creating issuer DID for domain: ${body.domain}`);
    return this.issuerService.createIssuer(
      body.domain,
      body.organization,
      body.description,
    )
  }

  // Get Issuer DID Document (for did:web)
  @Get('did/:domain')
  async getDidDocument(@Param('domain') domain: string) {
    return this.issuerService.getDidDocumentByDomain(domain)
  }

  // Verifier creates credential request (linked to Case ID)
  @Post('create-request')
  async createCredentialRequest(
    @Body('caseId') caseId: string,
    @Body('credentialType') credentialType: string,
    @Body('claims') claims: Record<string, any>,
  ) {
    return this.issuerService.createCredentialRequest(caseId, credentialType, claims)
  }

  // Holder registers after onboarding (links DID to caseId)
  @Post('register-holder')
  async registerHolder(
    @Body('caseId') caseId: string,
    @Body('holderDid') holderDid: string,
  ) {
    return this.issuerService.registerHolder(caseId, holderDid)
  }

  // Issuer issues VC for given case (returns JWE)
  @Get('issue/:caseId')
  async issueCredentialForCase(@Param('caseId') caseId: string) {
    return this.issuerService.issueCredentialForCase(caseId)
  }

  // @Post('request-credential')
  // async requestCredential(@Body() body: RequestCredentialDto) {
  //   this.logger.log(`📨 Received VC request: ${JSON.stringify(body, null, 2)}`);
  //   return this.issuerService.requestCredential(body)
  // }
  @Post('request-credential')
  async requestCredential(@Body() body: CreateCredentialRequestDto) {
    this.logger.log(`📨 Received VC request: ${JSON.stringify(body, null, 2)}`);
    return this.issuerService.createCredentialRequest(body.caseId, body.credentialType, body.claims)
  }

  @Get('requests/:holderDid')
  async getRequestsForHolder(@Param('holderDid') holderDid: string) {
    console.log('📥 holderDid param:', holderDid);
    return this.issuerService.getRequestsForHolder(holderDid);
  }


  // @Get('issue-credential/:requestId')
  // async issueCredential(@Param('requestId') requestId: string) {
  //   return this.issuerService.issueCredentialFromRequest(requestId)
  // }

}
