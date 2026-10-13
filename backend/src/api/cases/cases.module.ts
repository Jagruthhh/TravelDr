import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { ServicesModule } from '../../services/services.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ServicesModule, AuthModule],
  controllers: [CasesController],
})
export class CasesModule {}
