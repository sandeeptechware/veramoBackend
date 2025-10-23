import { Module } from '@nestjs/common';
import { IssuerController } from './controllers/issuer.controller'
import { IssuerService } from './services/issuer.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issuer } from './entities/issuer.entity';
import { VeramoModule } from '../veramo/veramo.module'
import { CredentialRequest } from './entities/credential-request.entity';
import { IssuedCredential } from './entities/issued-credential.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Issuer, CredentialRequest, IssuedCredential]),
    VeramoModule,
  ],
  controllers: [IssuerController],
  providers: [IssuerService],
  exports: [IssuerService],
})
export class IssuerModule {}
