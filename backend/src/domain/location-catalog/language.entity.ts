/**
 * Language domain entity representing standardized language options for travelers and doctors.
 */
export class Language {
  private readonly id: string;
  private readonly code: string;
  private readonly name: string;
  private readonly nativeName: string;
  private readonly isRtl: boolean;

  constructor(params: {
    id: string;
    code: string;
    name: string;
    nativeName: string;
    isRtl?: boolean;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('Language ID is required');
    }
    if (!params.code || params.code.trim().length < 2) {
      throw new Error('Valid language code is required (e.g. "en", "es")');
    }
    if (!params.name || params.name.trim() === '') {
      throw new Error('Language name is required');
    }

    this.id = params.id.trim();
    this.code = params.code.trim().toLowerCase();
    this.name = params.name.trim();
    this.nativeName = params.nativeName?.trim() || this.name;
    this.isRtl = params.isRtl ?? false;
  }

  public getId(): string {
    return this.id;
  }

  public getCode(): string {
    return this.code;
  }

  public getName(): string {
    return this.name;
  }

  public getNativeName(): string {
    return this.nativeName;
  }

  public getIsRtl(): boolean {
    return this.isRtl;
  }

  public matches(term: string): boolean {
    const normalized = term.trim().toLowerCase();
    return (
      this.code === normalized ||
      this.name.toLowerCase().includes(normalized) ||
      this.nativeName.toLowerCase().includes(normalized)
    );
  }
}
