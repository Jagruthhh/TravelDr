import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ServicesModule } from '../../services/services.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ServicesModule, AuthModule],
  controllers: [ProvidersController],
})
export class ProvidersModule {}
