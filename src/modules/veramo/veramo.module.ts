// src/modules/veramo/veramo.module.ts
import { Module } from '@nestjs/common'
import { VeramoService } from './veramo.service'

@Module({
  providers: [VeramoService],
  exports: [VeramoService],
})
export class VeramoModule {}
