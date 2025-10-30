// src/modules/issuer/controllers/issuer.controller.ts
import { Body, Controller, Post, Get, Param, Logger, Query, BadRequestException } from '@nestjs/common'
import { IssuerService } from '../services/issuer.service'
import { CreateIssuerDto } from '../dtos/create-issuer.dto'
import { RequestCredentialDto } from '../dtos/request-credential.dto'
import { CreateCredentialRequestDto } from '../dtos/create-credential-request.dto'
import { RegisterHolderDto } from '../dtos/register-holder.dto'

@Controller('issuer')
export class IssuerController {
  private readonly logger = new Logger(IssuerController.name);
  constructor(private readonly issuerService: IssuerService) { }


  //test endpoint
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

  // Verifier creates credential request (linked to Case ID)
  @Post('credential-request')
  async createCredentialRequest(
    @Body() body: CreateCredentialRequestDto,
    // @Body('caseId') caseId: string,
    // @Body('credentialType') credentialType: string,
    // @Body('claims') claims: Record<string, any>,
  ) {
    try {
      if(!body.caseId || !body.credentialType || !body.claims) {
        throw new BadRequestException('Missing required fields: caseId, credentialType and claims.');
      }
      const newRequest = await this.issuerService.createCredentialRequest(body.caseId, body.credentialType, body.claims);
      this.logger.log(`✅ Created credential request for caseId=${body.caseId}, credentialType=${body.credentialType}`);
      return newRequest;
    } catch (error) {
      this.logger.error(`❌ Failed to create credential request: ${error.message}`);
      throw error;
    }
  }

  @Get('status/:caseId')
async getCaseStatus(@Param('caseId') caseId: string) {
  return this.issuerService.getCaseStatus(caseId);
}

  @Post('create-issuer-did')
  async createIssuer(
    @Body() body: CreateIssuerDto
  ) {
    // try {
    //   if(!body.domain) {
    // } catch (error) {
      
    // }
    this.logger.log(`🌐 Creating issuer DID for domain: ${body.domain}`);
    return this.issuerService.createIssuer(
      body.domain,
      body.organization,
      body.description,
    )
  }

  // Holder registers after onboarding (links DID to caseId)
  @Post('register-holder')
  async registerHolder(
    @Body() body: RegisterHolderDto
  ) {
    return this.issuerService.registerHolder(body.caseId, body.holderDid);
  }


  // Issuer issues VC for given case (returns JWE)
  @Get('issue-credential/:caseId')
  async issueCredentialForCase(@Param('caseId') caseId: string) {
    try {
      if(!caseId) {
        throw new BadRequestException('Missing required field: caseId.');
      }
      return await this.issuerService.issueCredentialForCase(caseId);
    } catch (error) {
      this.logger.error(`❌ Failed to issue credential for caseId=${caseId}: ${error.message}`);
      throw error;
    }
  }

  // Get Issuer DID Document (for did:web)
  @Get('did/:domain')
  async getDidDocument(@Param('domain') domain: string) {
    return this.issuerService.getDidDocumentByDomain(domain)
  }

  //old flow
  // @Post('request-credential')
  // async requestCredential(@Body() body: RequestCredentialDto) {
  //   this.logger.log(`📨 Received VC request: ${JSON.stringify(body, null, 2)}`);
  //   return this.issuerService.requestCredential(body)
  // }
  // @Post('request-credential')
  // async requestCredential(@Body() body: CreateCredentialRequestDto) {
  //   this.logger.log(`📨 Received VC request: ${JSON.stringify(body, null, 2)}`);
  //   return this.issuerService.createCredentialRequest(body.caseId, body.credentialType, body.claims)
  // }

  //Issuer gets all requests for a given holder DID to reissue VCs to holder
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
