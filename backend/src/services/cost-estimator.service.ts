import { Inject, Injectable, Optional } from '@nestjs/common';
import { CostEstimate } from '../domain/providers/cost-estimate.value-object';
import { HealthcareProvider } from '../domain/providers/healthcare-provider.entity';
import { PriceEntry } from '../domain/providers/price-entry.entity';
import { PROVIDER_REPOSITORY, ProviderRepository } from '../repositories';

/**
 * Service for computing transparent medical cost estimates.
 * Returns an explicit CostEstimate value object, ensuring missing/expired prices
 * return a clear "no data" result (estimate.hasData === false) instead of null.
 */
@Injectable()
export class CostEstimator {
  private static defaultRepository?: ProviderRepository;

  constructor(
    @Optional()
    @Inject(PROVIDER_REPOSITORY)
    private readonly providerRepository?: ProviderRepository,
  ) {}

  /**
   * Configures a static fallback ProviderRepository for non-DI usage.
   */
  static setDefaultRepository(repository?: ProviderRepository): void {
    CostEstimator.defaultRepository = repository;
  }

  /**
   * Computes cost estimate for a provider and treatment.
   *
   * Accepts either a provider ID string (resolved via ProviderRepository)
   * or an already-loaded HealthcareProvider domain entity.
   *
   * Returns CostEstimate.noData() when:
   * - Provider is not found or repository unavailable
   * - Provider is inactive
   * - Provider has no price entry for the given treatment
   * - Price entry has expired or is not yet effective
   * - Input IDs are blank or invalid
   */
  async estimate(
    providerOrId: string | HealthcareProvider | null | undefined,
    treatmentId: string,
  ): Promise<CostEstimate> {
    if (!providerOrId || !treatmentId || treatmentId.trim() === '') {
      return CostEstimate.noData();
    }

    let provider: HealthcareProvider | null = null;

    if (typeof providerOrId === 'string') {
      if (providerOrId.trim() === '') {
        return CostEstimate.noData();
      }
      const repo = this.providerRepository || CostEstimator.defaultRepository;
      if (!repo) {
        return CostEstimate.noData();
      }
      provider = await repo.findById(providerOrId.trim());
    } else {
      provider = providerOrId;
    }

    if (!provider) {
      return CostEstimate.noData();
    }

    return CostEstimator.calculateFromProvider(provider, treatmentId.trim());
  }

  /**
   * Static helper: Synchronous when given a HealthcareProvider instance.
   */
  static estimate(
    provider: HealthcareProvider,
    treatmentId: string,
  ): CostEstimate;

  /**
   * Static helper: Asynchronous when given a provider ID string.
   */
  static estimate(
    providerId: string,
    treatmentId: string,
    repository?: ProviderRepository,
  ): Promise<CostEstimate>;

  /**
   * Static estimate implementation handling both domain entities and ID lookups.
   */
  static estimate(
    providerOrId: string | HealthcareProvider | null | undefined,
    treatmentId: string,
    repository?: ProviderRepository,
  ): CostEstimate | Promise<CostEstimate> {
    if (!providerOrId || !treatmentId || treatmentId.trim() === '') {
      return CostEstimate.noData();
    }

    if (typeof providerOrId === 'string') {
      const repo = repository || CostEstimator.defaultRepository;
      if (!repo) {
        return Promise.resolve(CostEstimate.noData());
      }
      return (async () => {
        const prov = await repo.findById(providerOrId.trim());
        if (!prov) {
          return CostEstimate.noData();
        }
        return CostEstimator.calculateFromProvider(prov, treatmentId.trim());
      })();
    }

    return CostEstimator.calculateFromProvider(providerOrId, treatmentId.trim());
  }

  /**
   * Checks whether valid pricing data exists for a provider and treatment.
   */
  async hasPriceData(
    providerOrId: string | HealthcareProvider,
    treatmentId: string,
  ): Promise<boolean> {
    const estimate = await this.estimate(providerOrId, treatmentId);
    return estimate.hasData;
  }

  private static calculateFromProvider(
    provider: HealthcareProvider,
    treatmentId: string,
  ): CostEstimate {
    if (!provider.getIsActive()) {
      return CostEstimate.noData();
    }

    const priceEntry: PriceEntry | undefined =
      provider.getPriceForTreatment(treatmentId);

    if (!priceEntry) {
      return CostEstimate.noData();
    }

    // priceEntry.toCostEstimate() automatically checks isCurrent()
    // and returns CostEstimate.noData() if expired/future-dated
    return priceEntry.toCostEstimate();
  }
}

/** Alias for NestJS injection conventions */
export const CostEstimatorService = CostEstimator;
