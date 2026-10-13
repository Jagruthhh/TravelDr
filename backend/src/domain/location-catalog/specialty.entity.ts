/**
 * Specialty domain entity representing medical specialties (e.g., General Practice, Pediatrics, Cardiology).
 */
export class Specialty {
  private readonly id: string;
  private name: string;
  private description: string;
  private iconName?: string;
  private isActive: boolean;

  constructor(params: {
    id: string;
    name: string;
    description: string;
    iconName?: string;
    isActive?: boolean;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('Specialty ID is required');
    }
    if (!params.name || params.name.trim() === '') {
      throw new Error('Specialty name is required');
    }

    this.id = params.id.trim();
    this.name = params.name.trim();
    this.description = params.description.trim();
    this.iconName = params.iconName?.trim();
    this.isActive = params.isActive ?? true;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getDescription(): string {
    return this.description;
  }

  public getIconName(): string | undefined {
    return this.iconName;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public update(name: string, description: string, iconName?: string): void {
    if (!name || name.trim() === '') {
      throw new Error('Specialty name cannot be empty');
    }
    this.name = name.trim();
    this.description = description.trim();
    if (iconName !== undefined) {
      this.iconName = iconName.trim();
    }
  }

  public setActiveStatus(isActive: boolean): void {
    this.isActive = isActive;
  }
}
