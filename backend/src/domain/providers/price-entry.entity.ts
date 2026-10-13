import { Currency } from '../common/enums';
import { CostEstimate } from './cost-estimate.value-object';

/**
 * PriceEntry domain entity providing transparent medical cost breakdowns.
 * Prevents hidden charges for travelers by specifying whether fees are fixed or estimated,
 * and what inclusions (such as facility fee or medicine) apply.
 */
export class PriceEntry {
  private readonly id: string;
  private readonly providerId: string;
  private readonly treatmentId: string;
  private amount: number;
  private currency: Currency;
  private isEstimate: boolean;
  private minAmount?: number;
  private maxAmount?: number;
  private notes: string;
  private includesMedicine: boolean;
  private includesFacilityFee: boolean;
  private effectiveFrom: Date;
  private effectiveUntil?: Date;

  constructor(params: {
    id: string;
    providerId: string;
    treatmentId: string;
    amount: number;
    currency: Currency;
    isEstimate?: boolean;
    minAmount?: number;
    maxAmount?: number;
    notes?: string;
    includesMedicine?: boolean;
    includesFacilityFee?: boolean;
    effectiveFrom?: Date;
    effectiveUntil?: Date;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('PriceEntry ID is required');
    }
    if (!params.providerId || params.providerId.trim() === '') {
      throw new Error('Provider ID is required');
    }
    if (!params.treatmentId || params.treatmentId.trim() === '') {
      throw new Error('Treatment ID is required');
    }
    if (params.amount < 0) {
      throw new Error('Price amount cannot be negative');
    }
    if (params.minAmount !== undefined && params.maxAmount !== undefined) {
      if (params.minAmount > params.maxAmount) {
        throw new Error('Minimum price cannot exceed maximum price');
      }
    }

    this.id = params.id.trim();
    this.providerId = params.providerId.trim();
    this.treatmentId = params.treatmentId.trim();
    this.amount = params.amount;
    this.currency = params.currency;
    this.isEstimate = params.isEstimate ?? false;
    this.minAmount = params.minAmount;
    this.maxAmount = params.maxAmount;
    this.notes = params.notes?.trim() ?? '';
    this.includesMedicine = params.includesMedicine ?? false;
    this.includesFacilityFee = params.includesFacilityFee ?? true;
    this.effectiveFrom = params.effectiveFrom ?? new Date();
    this.effectiveUntil = params.effectiveUntil;
  }

  public getId(): string {
    return this.id;
  }

  public getProviderId(): string {
    return this.providerId;
  }

  public getTreatmentId(): string {
    return this.treatmentId;
  }

  public getAmount(): number {
    return this.amount;
  }

  public getCurrency(): Currency {
    return this.currency;
  }

  public getIsEstimate(): boolean {
    return this.isEstimate;
  }

  public getMinAmount(): number | undefined {
    return this.minAmount;
  }

  /** Alias for getMinAmount() — spec-named accessor. */
  public getMinPrice(): number | undefined {
    return this.minAmount;
  }

  public getMaxAmount(): number | undefined {
    return this.maxAmount;
  }

  /** Alias for getMaxAmount() — spec-named accessor. */
  public getMaxPrice(): number | undefined {
    return this.maxAmount;
  }

  public getNotes(): string {
    return this.notes;
  }

  public getIncludesMedicine(): boolean {
    return this.includesMedicine;
  }

  public getIncludesFacilityFee(): boolean {
    return this.includesFacilityFee;
  }

  public getEffectiveFrom(): Date {
    return this.effectiveFrom;
  }

  public getEffectiveUntil(): Date | undefined {
    return this.effectiveUntil;
  }

  public isCurrent(): boolean {
    const now = Date.now();
    const isStarted = this.effectiveFrom.getTime() <= now;
    const isNotExpired = !this.effectiveUntil || this.effectiveUntil.getTime() >= now;
    return isStarted && isNotExpired;
  }

  public getFormattedPrice(): string {
    if (this.isEstimate && this.minAmount !== undefined && this.maxAmount !== undefined) {
      return `~${this.currency} ${this.minAmount} - ${this.maxAmount}`;
    }
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  public updatePrice(amount: number, minAmount?: number, maxAmount?: number, notes?: string): void {
    if (amount < 0) {
      throw new Error('Price amount cannot be negative');
    }
    if (minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) {
      throw new Error('Minimum price cannot exceed maximum price');
    }
    this.amount = amount;
    this.minAmount = minAmount;
    this.maxAmount = maxAmount;
    if (notes !== undefined) {
      this.notes = notes.trim();
    }
  }

  /**
   * Converts this entry to an immutable CostEstimate value object.
   * Returns CostEstimate.noData() when the entry is not current (expired / not yet active).
   */
  public toCostEstimate(): CostEstimate {
    if (!this.isCurrent()) {
      return CostEstimate.noData();
    }
    return CostEstimate.fromValues({
      treatmentId: this.treatmentId,
      currency: this.currency,
      price: this.amount,
      minPrice: this.minAmount,
      maxPrice: this.maxAmount,
      isEstimate: this.isEstimate,
    });
  }
}
