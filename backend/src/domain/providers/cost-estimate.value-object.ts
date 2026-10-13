import { Currency } from '../common/enums';

/**
 * Discriminated-union result returned by CostEstimate.
 *
 *   { hasData: false }               – no pricing information available
 *   { hasData: true,  ...fields }    – concrete estimate with at least a point price
 */
export type CostEstimateResult =
  | { readonly hasData: false }
  | {
      readonly hasData: true;
      readonly treatmentId: string;
      readonly currency: Currency;
      /** Point/midpoint price in the given currency. */
      readonly price: number;
      /** Lower bound of price range; equals `price` when not a range estimate. */
      readonly minPrice: number;
      /** Upper bound of price range; equals `price` when not a range estimate. */
      readonly maxPrice: number;
      /** True when min/max diverge from the point price (i.e. a real range). */
      readonly isRange: boolean;
      /** True when the figure is an estimate, not a guaranteed fixed price. */
      readonly isEstimate: boolean;
      /** Human-readable label, e.g. "~USD 200 - 400" or "USD 350.00". */
      readonly label: string;
    };

/** Singleton sentinel for a missing-price result. */
const NO_DATA: CostEstimateResult = Object.freeze({ hasData: false } as const);

/**
 * CostEstimate value object.
 *
 * Immutable; constructed via static factories so callers never deal with
 * nullable return types – a missing price is an explicit, typed value.
 *
 * @example
 *   const estimate = CostEstimate.fromPriceEntry(entry);
 *   if (!estimate.hasData) {
 *     // surface "price not available" in the UI
 *   } else {
 *     console.log(estimate.label); // "~USD 200 - 400"
 *   }
 */
export class CostEstimate {
  private constructor(private readonly result: CostEstimateResult) {}

  // ─── Factories ──────────────────────────────────────────────────────────────

  /**
   * Returns the NO_DATA sentinel.
   * Use this when no PriceEntry exists for the requested treatment/provider pair.
   */
  static noData(): CostEstimate {
    return new CostEstimate(NO_DATA);
  }

  /**
   * Builds a CostEstimate from raw price components.
   * Returns noData() if `price` is undefined or null.
   */
  static fromValues(params: {
    treatmentId: string;
    currency: Currency;
    price?: number | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    isEstimate?: boolean;
  }): CostEstimate {
    if (params.price == null) {
      return CostEstimate.noData();
    }

    const price = params.price;
    const minPrice = params.minPrice ?? price;
    const maxPrice = params.maxPrice ?? price;
    const isEstimate = params.isEstimate ?? false;
    const isRange = minPrice !== maxPrice;

    const label = isEstimate && isRange
      ? `~${params.currency} ${minPrice} - ${maxPrice}`
      : `${params.currency} ${price.toFixed(2)}`;

    return new CostEstimate({
      hasData: true,
      treatmentId: params.treatmentId,
      currency: params.currency,
      price,
      minPrice,
      maxPrice,
      isRange,
      isEstimate,
      label,
    });
  }

  // ─── Result accessor ─────────────────────────────────────────────────────────

  /**
   * The typed result – narrow on `result.hasData` before accessing data fields.
   */
  get data(): CostEstimateResult {
    return this.result;
  }

  /** True when this estimate carries real pricing data. */
  get hasData(): boolean {
    return this.result.hasData;
  }
}
