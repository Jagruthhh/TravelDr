/**
 * ApiModule — barrel module for all HTTP-facing feature modules.
 * Add new feature modules here as the API grows.
 */
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProvidersModule } from './providers/providers.module';
import { CasesModule } from './cases/cases.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [HealthModule, AuthModule, ProvidersModule, CasesModule, ReviewsModule],
})
export class ApiModule {}
