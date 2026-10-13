import { Inject, Injectable, Optional } from '@nestjs/common';
import { HealthcareProvider } from '../domain';
import { PROVIDER_REPOSITORY, ProviderRepository } from '../repositories';
import {
  RANKING_STRATEGY,
  RankingContext,
  RankingStrategy,
  NearestRanking,
} from './ranking';

export interface ProviderSearchParams {
  city?: string;
  language?: string;
  specialty?: string;
  verifiedOnly?: boolean;
  context?: RankingContext;
}

/**
 * Service orchestrating healthcare provider search and ranking.
 * Uses a pluggable RankingStrategy (defaulting to NearestRanking).
 */
@Injectable()
export class ProviderSearchService {
  private rankingStrategy: RankingStrategy;

  constructor(
    @Inject(PROVIDER_REPOSITORY)
    private readonly providerRepository: ProviderRepository,
    @Optional()
    @Inject(RANKING_STRATEGY)
    rankingStrategy?: RankingStrategy,
  ) {
    this.rankingStrategy = rankingStrategy ?? new NearestRanking();
  }

  /**
   * Replaces or configures the active ranking strategy at runtime.
   */
  public setRankingStrategy(strategy: RankingStrategy): void {
    this.rankingStrategy = strategy;
  }

  public getRankingStrategy(): RankingStrategy {
    return this.rankingStrategy;
  }

  /**
   * Searches providers filtered by city, language, specialty, and verification status,
   * then orders the results using the configured RankingStrategy (NearestRanking).
   *
   * Supports both positional arguments:
   *   search(city, language, specialty, verifiedOnly, context?)
   * and object parameters:
   *   search({ city, language, specialty, verifiedOnly, context })
   */
  async search(
    cityOrParams?: string | ProviderSearchParams,
    language?: string,
    specialty?: string,
    verifiedOnly: boolean = false,
    context?: RankingContext,
  ): Promise<HealthcareProvider[]> {
    let cityParam: string | undefined;
    let languageParam: string | undefined;
    let specialtyParam: string | undefined;
    let verifiedOnlyParam = false;
    let contextParam: RankingContext | undefined = context;

    if (typeof cityOrParams === 'object' && cityOrParams !== null) {
      cityParam = cityOrParams.city;
      languageParam = cityOrParams.language;
      specialtyParam = cityOrParams.specialty;
      verifiedOnlyParam = cityOrParams.verifiedOnly ?? false;
      contextParam = cityOrParams.context ?? context;
    } else {
      cityParam = cityOrParams;
      languageParam = language;
      specialtyParam = specialty;
      verifiedOnlyParam = verifiedOnly ?? false;
    }

    // 1. Query repository using criteria
    const candidates = await this.providerRepository.findAll({
      cityId: cityParam,
      languageCode: languageParam,
      specialtyId: specialtyParam,
      isVerified: verifiedOnlyParam ? true : undefined,
      isActive: true,
    });

    // 2. Perform in-memory domain validation filters as a safeguard
    const filtered = candidates.filter((provider) => {
      if (!provider.getIsActive()) {
        return false;
      }
      if (cityParam && provider.getCityId() !== cityParam) {
        return false;
      }
      if (languageParam && !provider.supportsLanguage(languageParam)) {
        return false;
      }
      if (
        specialtyParam &&
        !provider.getSpecialtyIds().includes(specialtyParam)
      ) {
        return false;
      }
      if (verifiedOnlyParam && !provider.isVerified()) {
        return false;
      }
      return true;
    });

    // 3. Rank results using the active Strategy (NearestRanking)
    return this.rankingStrategy.rank(filtered, contextParam);
  }
}
