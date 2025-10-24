// src/main.ts
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { initVeramoDB } from './modules/veramo/veramo.config' 
import 'dotenv/config'

async function bootstrap() {
  await initVeramoDB()
  const app = await NestFactory.create(AppModule)

  // Validate incoming DTOs
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, // remove unexpected fields
    forbidNonWhitelisted: false,
    transform: true, // auto-transform payloads to DTO types
   }))

  const port = process.env.PORT || 3333
  await app.listen(port)
  console.log(`✅ Server running on http://localhost:${port}`)
}
bootstrap()