import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { IssuerService } from '../modules/issuer/services/issuer.service';

@Controller()
export class DidWellKnownController {
  constructor(private readonly issuerSvc: IssuerService) {}

  // GET /.well-known/did.json?domain=localhost:3333
  @Get('.well-known/did.json')
  async getDid(@Req() req: Request, @Res() res: Response) {
    // For local testing we'll decide domain from host header or query
    const host = req.headers.host || req.query.domain;
    if (!host) return res.status(400).json({ error: 'domain (host) required' });

    const d = await this.issuerSvc.getDidDocumentByDomain(host.toString());
    if (!d) return res.status(404).json({ error: 'DID not found' });
    return res.json(d);
  }
}
