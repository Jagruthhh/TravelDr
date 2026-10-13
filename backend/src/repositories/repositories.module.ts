import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PROVIDER_REPOSITORY } from './provider.repository.interface';
import { PrismaProviderRepository } from './prisma-provider.repository';
import { CASE_REPOSITORY } from './case.repository.interface';
import { PrismaCaseRepository } from './prisma-case.repository';

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
  ],
  exports: [PROVIDER_REPOSITORY, CASE_REPOSITORY, PrismaService],
})
export class RepositoriesModule {}
