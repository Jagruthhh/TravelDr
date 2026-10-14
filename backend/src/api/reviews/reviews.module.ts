import { Module } from '@nestjs/common';
import { ServicesModule } from '../../services/services.module';
import { AuthModule } from '../auth/auth.module';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [ServicesModule, AuthModule],
  controllers: [ReviewsController],
  exports: [],
})
export class ReviewsModule {}
