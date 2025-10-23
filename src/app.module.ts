// src/app.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { IssuerModule } from './modules/issuer/issuer.module'
import { Issuer } from './modules/issuer/entities/issuer.entity'
import { CredentialRequest } from './modules/issuer/entities/credential-request.entity'
import { AppController } from './controllers/app.controller'
import { dbConnection } from './modules/veramo/veramo.config'
import 'dotenv/config'

@Module({
  // imports: [
  //   ConfigModule.forRoot({ isGlobal: true }),
  //   TypeOrmModule.forRootAsync({
  //     type: 'sqlite',
  //     database: './data/app.sqlite',
  //     synchronize: true, // ✅ auto create tables (dev only)
  //     autoLoadEntities: true,
  //   }),
  //   IssuerModule,
  // ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        console.log('💾 Using SQLite DB path:', dbConnection.options.database);
        console.log('📂 Shared SQLite DB path:', dbConnection.options.database);
        console.log('📦 Entities from Veramo:', dbConnection.options.entities?.length || 0);
        return {
          type: 'sqlite',
          database: dbConnection.options.database as string,
          synchronize: true,
          // dropSchema: true, //deletes and recreates the database schema on every application launch
          entities: [
            ...(Array.isArray(dbConnection.options.entities)
              ? dbConnection.options.entities
              : []),
            Issuer,
            CredentialRequest,
          ],
        }
      },
    }),
    IssuerModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
