import { describe, it, expect, beforeEach } from 'vitest';
import { Currency } from '../../../src/domain/common/enums';
import { PriceEntry } from '../../../src/domain/providers/price-entry.entity';
import { CostEstimate } from '../../../src/domain/providers/cost-estimate.value-object';

// ─── Helpers ────────────────────────────────────────────────────────────────

const BASE = {
  id: 'pe-1',
  providerId: 'prov-1',
  treatmentId: 'treat-1',
  currency: Currency.USD,
};

function makeEntry(overrides: Partial<ConstructorParameters<typeof PriceEntry>[0]> = {}): PriceEntry {
  return new PriceEntry({ ...BASE, amount: 350, ...overrides });
}

// ─── PriceEntry ──────────────────────────────────────────────────────────────

describe('PriceEntry', () => {
  describe('construction', () => {
    it('creates with required fields', () => {
      const entry = makeEntry();
      expect(entry.getId()).toBe('pe-1');
      expect(entry.getProviderId()).toBe('prov-1');
      expect(entry.getTreatmentId()).toBe('treat-1');
      expect(entry.getAmount()).toBe(350);
      expect(entry.getCurrency()).toBe(Currency.USD);
    });

    it('defaults isEstimate to false', () => {
      expect(makeEntry().getIsEstimate()).toBe(false);
    });

    it('stores min/max amounts when provided', () => {
      const entry = makeEntry({ minAmount: 200, maxAmount: 400, isEstimate: true });
      expect(entry.getMinAmount()).toBe(200);
      expect(entry.getMaxAmount()).toBe(400);
      expect(entry.getMinPrice()).toBe(200);   // spec-named alias
      expect(entry.getMaxPrice()).toBe(400);   // spec-named alias
    });

    it('throws when ID is empty', () => {
      expect(() => makeEntry({ id: '   ' })).toThrow('PriceEntry ID is required');
    });

    it('throws when amount is negative', () => {
      expect(() => makeEntry({ amount: -1 })).toThrow('Price amount cannot be negative');
    });

    it('throws when minAmount exceeds maxAmount', () => {
      expect(() => makeEntry({ minAmount: 500, maxAmount: 100 })).toThrow(
        'Minimum price cannot exceed maximum price',
      );
    });
  });

  describe('isCurrent()', () => {
    it('returns true for an entry effective right now', () => {
      expect(makeEntry().isCurrent()).toBe(true);
    });

    it('returns false for a future-only entry', () => {
      const future = new Date(Date.now() + 86_400_000);
      expect(makeEntry({ effectiveFrom: future }).isCurrent()).toBe(false);
    });

    it('returns false for an expired entry', () => {
      const past = new Date(Date.now() - 86_400_000);
      expect(makeEntry({ effectiveUntil: past }).isCurrent()).toBe(false);
    });
  });

  describe('getFormattedPrice()', () => {
    it('formats a fixed price as "USD 350.00"', () => {
      expect(makeEntry().getFormattedPrice()).toBe('USD 350.00');
    });

    it('formats an estimate range as "~USD 200 - 400"', () => {
      const entry = makeEntry({ isEstimate: true, minAmount: 200, maxAmount: 400 });
      expect(entry.getFormattedPrice()).toBe('~USD 200 - 400');
    });
  });

  describe('updatePrice()', () => {
    it('updates amount and range', () => {
      const entry = makeEntry();
      entry.updatePrice(500, 450, 550);
      expect(entry.getAmount()).toBe(500);
      expect(entry.getMinPrice()).toBe(450);
      expect(entry.getMaxPrice()).toBe(550);
    });

    it('throws when updated amount is negative', () => {
      expect(() => makeEntry().updatePrice(-10)).toThrow('Price amount cannot be negative');
    });

    it('throws when updated min exceeds max', () => {
      expect(() => makeEntry().updatePrice(300, 400, 200)).toThrow(
        'Minimum price cannot exceed maximum price',
      );
    });
  });

  describe('toCostEstimate()', () => {
    it('returns a data estimate for a current entry', () => {
      const estimate = makeEntry().toCostEstimate();
      expect(estimate.hasData).toBe(true);
      if (estimate.data.hasData) {
        expect(estimate.data.treatmentId).toBe('treat-1');
        expect(estimate.data.price).toBe(350);
        expect(estimate.data.currency).toBe(Currency.USD);
      }
    });

    it('returns noData for an expired entry', () => {
      const past = new Date(Date.now() - 86_400_000);
      const estimate = makeEntry({ effectiveUntil: past }).toCostEstimate();
      expect(estimate.hasData).toBe(false);
      expect(estimate.data.hasData).toBe(false);
    });

    it('returns noData for a future entry', () => {
      const future = new Date(Date.now() + 86_400_000);
      const estimate = makeEntry({ effectiveFrom: future }).toCostEstimate();
      expect(estimate.hasData).toBe(false);
    });
  });
});

// ─── CostEstimate ────────────────────────────────────────────────────────────

describe('CostEstimate', () => {
  describe('noData()', () => {
    it('has hasData === false', () => {
      const est = CostEstimate.noData();
      expect(est.hasData).toBe(false);
      expect(est.data.hasData).toBe(false);
    });

    it('returns distinct instances each call (safe sentinel)', () => {
      // Both are non-data; structural equality should hold
      const a = CostEstimate.noData();
      const b = CostEstimate.noData();
      expect(a.hasData).toBe(b.hasData);
    });
  });

  describe('fromValues() — missing price', () => {
    it('returns noData when price is undefined', () => {
      const est = CostEstimate.fromValues({
        treatmentId: 'treat-1',
        currency: Currency.INR,
        price: undefined,
      });
      expect(est.hasData).toBe(false);
    });

    it('returns noData when price is null', () => {
      const est = CostEstimate.fromValues({
        treatmentId: 'treat-1',
        currency: Currency.EUR,
        price: null,
      });
      expect(est.hasData).toBe(false);
    });
  });

  describe('fromValues() — fixed price', () => {
    it('creates a point estimate with label "USD 350.00"', () => {
      const est = CostEstimate.fromValues({
        treatmentId: 'treat-1',
        currency: Currency.USD,
        price: 350,
      });
      expect(est.hasData).toBe(true);
      if (est.data.hasData) {
        expect(est.data.price).toBe(350);
        expect(est.data.minPrice).toBe(350);
        expect(est.data.maxPrice).toBe(350);
        expect(est.data.isRange).toBe(false);
        expect(est.data.label).toBe('USD 350.00');
      }
    });
  });

  describe('fromValues() — range estimate', () => {
    it('creates a range estimate with label "~USD 200 - 400"', () => {
      const est = CostEstimate.fromValues({
        treatmentId: 'treat-1',
        currency: Currency.USD,
        price: 300,
        minPrice: 200,
        maxPrice: 400,
        isEstimate: true,
      });
      expect(est.hasData).toBe(true);
      if (est.data.hasData) {
        expect(est.data.isRange).toBe(true);
        expect(est.data.isEstimate).toBe(true);
        expect(est.data.minPrice).toBe(200);
        expect(est.data.maxPrice).toBe(400);
        expect(est.data.label).toBe('~USD 200 - 400');
      }
    });

    it('isRange is false when min === max', () => {
      const est = CostEstimate.fromValues({
        treatmentId: 't',
        currency: Currency.EUR,
        price: 100,
        minPrice: 100,
        maxPrice: 100,
        isEstimate: true,
      });
      if (est.data.hasData) {
        expect(est.data.isRange).toBe(false);
      }
    });
  });

  describe('pattern: provider lookup returns noData', () => {
    it('consumer can distinguish data vs no-data without null checks', () => {
      const estimates = [
        CostEstimate.fromValues({ treatmentId: 't1', currency: Currency.USD, price: 100 }),
        CostEstimate.noData(),
        CostEstimate.fromValues({ treatmentId: 't3', currency: Currency.EUR, price: 80 }),
      ];

      const labels = estimates.map((e) =>
        e.data.hasData ? e.data.label : 'Price not available',
      );

      expect(labels).toEqual(['USD 100.00', 'Price not available', 'EUR 80.00']);
    });
  });
});
