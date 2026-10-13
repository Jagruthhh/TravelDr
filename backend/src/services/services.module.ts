import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { ProviderService } from './provider.service';
import { CaseService } from './case.service';
import { HelplineService } from './helpline.service';
import { ProviderSearchService } from './provider-search.service';
import { NearestRanking, RANKING_STRATEGY } from './ranking';
import { CostEstimator } from './cost-estimator.service';
import {
  SmsNotifier,
  EmailNotifier,
  NotifierFactory,
  NOTIFIER_FACTORY,
} from './notifications';

@Module({
  imports: [RepositoriesModule],
  providers: [
    ProviderService,
    CaseService,
    HelplineService,
    ProviderSearchService,
    CostEstimator,
    SmsNotifier,
    EmailNotifier,
    NotifierFactory,
    {
      provide: NOTIFIER_FACTORY,
      useClass: NotifierFactory,
    },
    {
      provide: RANKING_STRATEGY,
      useClass: NearestRanking,
    },
  ],
  exports: [
    ProviderService,
    CaseService,
    HelplineService,
    ProviderSearchService,
    CostEstimator,
    SmsNotifier,
    EmailNotifier,
    NotifierFactory,
    NOTIFIER_FACTORY,
    RANKING_STRATEGY,
  ],
})
export class ServicesModule {}
