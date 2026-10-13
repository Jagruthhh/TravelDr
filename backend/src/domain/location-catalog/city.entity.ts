export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface EmergencyNumbers {
  ambulance: string;
  police: string;
  generalEmergency?: string;
}

/**
 * City domain entity representing destinations where travelers seek medical services.
 * Contains local emergency dispatch numbers and geographic coordinates.
 */
export class City {
  private readonly id: string;
  private readonly name: string;
  private readonly countryCode: string;
  private readonly countryName: string;
  private readonly timezone: string;
  private emergencyNumbers: EmergencyNumbers;
  private coordinates?: Coordinates;
  private isActive: boolean;

  constructor(params: {
    id: string;
    name: string;
    countryCode: string;
    countryName: string;
    timezone: string;
    emergencyNumbers: EmergencyNumbers;
    coordinates?: Coordinates;
    isActive?: boolean;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('City ID is required');
    }
    if (!params.name || params.name.trim() === '') {
      throw new Error('City name is required');
    }
    if (!params.countryCode || params.countryCode.trim().length !== 2) {
      throw new Error('Valid 2-letter ISO country code is required');
    }
    if (!params.emergencyNumbers?.ambulance) {
      throw new Error('Ambulance emergency number is required for destination city');
    }

    this.id = params.id.trim();
    this.name = params.name.trim();
    this.countryCode = params.countryCode.trim().toUpperCase();
    this.countryName = params.countryName.trim();
    this.timezone = params.timezone.trim();
    this.emergencyNumbers = { ...params.emergencyNumbers };
    this.coordinates = params.coordinates;
    this.isActive = params.isActive ?? true;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getCountryCode(): string {
    return this.countryCode;
  }

  public getCountryName(): string {
    return this.countryName;
  }

  public getTimezone(): string {
    return this.timezone;
  }

  public getEmergencyNumbers(): EmergencyNumbers {
    return { ...this.emergencyNumbers };
  }

  public getCoordinates(): Coordinates | undefined {
    return this.coordinates ? { ...this.coordinates } : undefined;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getFormattedLocation(): string {
    return `${this.name}, ${this.countryName}`;
  }

  public updateEmergencyNumbers(numbers: Partial<EmergencyNumbers>): void {
    this.emergencyNumbers = {
      ...this.emergencyNumbers,
      ...numbers,
    };
  }

  public setActiveStatus(isActive: boolean): void {
    this.isActive = isActive;
  }
}
