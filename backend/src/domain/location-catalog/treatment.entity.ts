/**
 * Treatment domain entity representing standard clinical procedures,
 * consultations, and interventions available for transparent pricing.
 */
export class Treatment {
  private readonly id: string;
  private name: string;
  private readonly specialtyId: string;
  private description: string;
  private standardDurationMinutes: number;
  private isActive: boolean;

  constructor(params: {
    id: string;
    name: string;
    specialtyId: string;
    description: string;
    standardDurationMinutes?: number;
    isActive?: boolean;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('Treatment ID is required');
    }
    if (!params.name || params.name.trim() === '') {
      throw new Error('Treatment name is required');
    }
    if (!params.specialtyId || params.specialtyId.trim() === '') {
      throw new Error('Specialty ID is required');
    }

    this.id = params.id.trim();
    this.name = params.name.trim();
    this.specialtyId = params.specialtyId.trim();
    this.description = params.description.trim();
    this.standardDurationMinutes = params.standardDurationMinutes ?? 30;
    this.isActive = params.isActive ?? true;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getSpecialtyId(): string {
    return this.specialtyId;
  }

  public getDescription(): string {
    return this.description;
  }

  public getStandardDurationMinutes(): number {
    return this.standardDurationMinutes;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public update(name: string, description: string, durationMinutes: number): void {
    if (!name || name.trim() === '') {
      throw new Error('Treatment name cannot be empty');
    }
    if (durationMinutes <= 0) {
      throw new Error('Duration must be greater than zero minutes');
    }
    this.name = name.trim();
    this.description = description.trim();
    this.standardDurationMinutes = durationMinutes;
  }

  public setActiveStatus(isActive: boolean): void {
    this.isActive = isActive;
  }
}
