import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PROVIDER_REPOSITORY } from './provider.repository.interface';
import { PrismaProviderRepository } from './prisma-provider.repository';
import { CASE_REPOSITORY } from './case.repository.interface';
import { PrismaCaseRepository } from './prisma-case.repository';
import { REVIEW_REPOSITORY } from './review.repository.interface';
import { PrismaReviewRepository } from './prisma-review.repository';

@Module({
  providers: [
    PrismaService,
    {
      provide: PROVIDER_REPOSITORY,
      useClass: PrismaProviderRepository,
    },
    {
      provide: CASE_REPOSITORY,
      useClass: PrismaCaseRepository,
    },
    {
      provide: REVIEW_REPOSITORY,
      useClass: PrismaReviewRepository,
    },
  ],
  exports: [
    PROVIDER_REPOSITORY,
    CASE_REPOSITORY,
    REVIEW_REPOSITORY,
    PrismaService,
  ],
})
export class RepositoriesModule {}
