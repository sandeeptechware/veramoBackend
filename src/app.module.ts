// src/app.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { IssuerModule } from './modules/issuer/issuer.module'
import { Issuer } from './modules/issuer/entities/issuer.entity'
import { CredentialRequest } from './modules/issuer/entities/credential-request.entity'
import 'dotenv/config'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: './data/app.sqlite',
      synchronize: true, // ✅ auto create tables (dev only)
      autoLoadEntities: true,
    }),
    IssuerModule,
  ],
})
export class AppModule {}
