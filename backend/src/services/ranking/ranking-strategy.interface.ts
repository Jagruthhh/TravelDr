import { HealthcareProvider } from '../../domain';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RankingContext {
  /**
   * Geographic coordinates of the searching traveler/user.
   */
  userLocation?: Coordinates;

  /**
   * Map or dictionary of provider ID -> Coordinates.
   */
  providerLocations?: Map<string, Coordinates> | Record<string, Coordinates>;

  /**
   * Pre-calculated distance in kilometers for each provider ID.
   */
  providerDistances?: Map<string, number> | Record<string, number>;
}

/**
 * Strategy interface for ranking and ordering healthcare providers.
 */
export interface RankingStrategy {
  rank(
    providers: HealthcareProvider[],
    context?: RankingContext,
  ): HealthcareProvider[];
}

/**
 * Injection token for RankingStrategy in NestJS dependency injection.
 */
export const RANKING_STRATEGY = Symbol('RANKING_STRATEGY');
