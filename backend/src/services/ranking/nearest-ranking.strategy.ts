import { Injectable } from '@nestjs/common';
import { HealthcareProvider } from '../../domain';
import {
  Coordinates,
  RankingContext,
  RankingStrategy,
} from './ranking-strategy.interface';

/**
 * NearestRanking strategy ordering providers by geographic proximity
 * to the searching traveler (ascending distance).
 */
@Injectable()
export class NearestRanking implements RankingStrategy {
  rank(
    providers: HealthcareProvider[],
    context?: RankingContext,
  ): HealthcareProvider[] {
    if (!providers || providers.length <= 1) {
      return [...providers];
    }

    if (!context) {
      return [...providers];
    }

    const { userLocation, providerLocations, providerDistances } = context;

    // Calculate/retrieve distance for each provider
    const mapped = providers.map((provider) => {
      const distance = this.resolveDistance(
        provider,
        userLocation,
        providerLocations,
        providerDistances,
      );
      return { provider, distance };
    });

    // Sort ascending by distance (unknown distances go to the end)
    mapped.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      if (a.distance !== undefined) {
        return -1;
      }
      if (b.distance !== undefined) {
        return 1;
      }
      return 0;
    });

    return mapped.map((m) => m.provider);
  }

  /**
   * Calculates the distance for a provider based on available context data.
   */
  resolveDistance(
    provider: HealthcareProvider,
    userLocation?: Coordinates,
    providerLocations?: Map<string, Coordinates> | Record<string, Coordinates>,
    providerDistances?: Map<string, number> | Record<string, number>,
  ): number | undefined {
    const providerId = provider.getId();

    // 1. Check pre-calculated distances map/record
    if (providerDistances) {
      if (providerDistances instanceof Map) {
        if (providerDistances.has(providerId)) {
          return providerDistances.get(providerId);
        }
      } else if (providerId in providerDistances) {
        return providerDistances[providerId];
      }
    }

    // 2. Compute Haversine distance if userLocation and provider location exist
    if (userLocation && providerLocations) {
      let pCoords: Coordinates | undefined;

      if (providerLocations instanceof Map) {
        pCoords = providerLocations.get(providerId);
      } else if (providerId in providerLocations) {
        pCoords = providerLocations[providerId];
      }

      if (pCoords) {
        return this.haversineDistance(userLocation, pCoords);
      }
    }

    // 3. Fallback to attached provider coordinates if present
    const anyProvider = provider as any;
    if (userLocation && anyProvider.coordinates) {
      return this.haversineDistance(userLocation, anyProvider.coordinates);
    }

    if (typeof anyProvider.distance === 'number') {
      return anyProvider.distance;
    }

    return undefined;
  }

  /**
   * Haversine formula calculating great-circle distance between two points in km.
   */
  haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's mean radius in kilometers
    const dLat = this.toRadians(coord2.latitude - coord1.latitude);
    const dLon = this.toRadians(coord2.longitude - coord1.longitude);

    const lat1 = this.toRadians(coord1.latitude);
    const lat2 = this.toRadians(coord2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100; // Round to 2 decimal places
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
