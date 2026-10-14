import {
  HealthResponse,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserProfileResponse,
  RoleCheckResponse,
  GetProvidersQuery,
  GetProviderDetailQuery,
  UpdateProviderVerificationRequest,
  CreateProviderRequest,
  Provider,
  CreateCaseRequest,
  UpdateCaseStatusRequest,
  HelplineCaseResponse,
  Review,
  ReviewStatus,
  CreateReviewRequest,
  ModerateReviewResponse,
} from '../types/api';

/**
 * Custom error thrown when the API returns an error response.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

export interface RequestOptions extends RequestInit {
  token?: string;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Strongly-typed API client for FixMyItch (TravelDoc) backend.
 * Provides exactly one method per backend endpoint with automated token attachment,
 * query serialization, and robust error handling.
 */
export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ||
      (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
      'http://localhost:3001';
  }

  // ─── Token Management ────────────────────────────────────────────────────────

  /** Sets the default Bearer authentication token for subsequent requests */
  public setToken(token: string | null): void {
    this.authToken = token;
  }

  /** Retrieves the currently configured Bearer authentication token */
  public getToken(): string | null {
    return this.authToken;
  }

  /** Updates the API base URL */
  public setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  // ─── Base Request Dispatcher ─────────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { token, params, headers, ...customConfig } = options;

    let url = `${this.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const activeToken = token !== undefined ? token : this.authToken;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    if (activeToken) {
      requestHeaders['Authorization'] = `Bearer ${activeToken}`;
    }

    const response = await fetch(url, {
      ...customConfig,
      headers: requestHeaders,
    });

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      try {
        data = await response.text();
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const errorMessage =
        (data && (data.message || data.error)) ||
        `HTTP Error ${response.status}: ${response.statusText}`;
      const formattedMessage = Array.isArray(errorMessage)
        ? errorMessage.join(', ')
        : String(errorMessage);

      throw new ApiClientError(formattedMessage, response.status, data);
    }

    return data as T;
  }

  // ─── Health Endpoints ────────────────────────────────────────────────────────

  /**
   * GET /health
   * Checks backend system health and liveness.
   */
  public async checkHealth(options?: RequestOptions): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health', {
      method: 'GET',
      ...options,
    });
  }

  // ─── Authentication Endpoints ────────────────────────────────────────────────

  /**
   * POST /auth/register
   * Registers a new user account with hashed credentials.
   */
  public async register(
    data: RegisterRequest,
    options?: RequestOptions,
  ): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });

    if (res?.accessToken) {
      this.setToken(res.accessToken);
    }
    return res;
  }

  /**
   * POST /auth/login
   * Authenticates user credentials and retrieves JWT token.
   */
  public async login(
    data: LoginRequest,
    options?: RequestOptions,
  ): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });

    if (res?.accessToken) {
      this.setToken(res.accessToken);
    }
    return res;
  }

  /**
   * GET /auth/me
   * Retrieves profile for currently authenticated user.
   * Requires JWT Bearer token.
   */
  public async getProfile(
    options?: RequestOptions,
  ): Promise<UserProfileResponse> {
    return this.request<UserProfileResponse>('/auth/me', {
      method: 'GET',
      ...options,
    });
  }

  /**
   * GET /auth/admin
   * Protected route verifying ADMIN role access.
   */
  public async checkAdminAccess(
    options?: RequestOptions,
  ): Promise<RoleCheckResponse> {
    return this.request<RoleCheckResponse>('/auth/admin', {
      method: 'GET',
      ...options,
    });
  }

  /**
   * GET /auth/agent
   * Protected route verifying HELPLINE_AGENT or ADMIN role access.
   */
  public async checkAgentAccess(
    options?: RequestOptions,
  ): Promise<RoleCheckResponse> {
    return this.request<RoleCheckResponse>('/auth/agent', {
      method: 'GET',
      ...options,
    });
  }

  /**
   * GET /auth/provider
   * Protected route verifying PROVIDER_STAFF or ADMIN role access.
   */
  public async checkProviderStaffAccess(
    options?: RequestOptions,
  ): Promise<RoleCheckResponse> {
    return this.request<RoleCheckResponse>('/auth/provider', {
      method: 'GET',
      ...options,
    });
  }

  // ─── Provider Endpoints ──────────────────────────────────────────────────────

  /**
   * GET /providers
   * Searches and filters healthcare providers with query parameters.
   *
   * @param params - { city, language, specialty, verifiedOnly, treatmentId }
   */
  public async getProviders(
    params?: GetProvidersQuery,
    options?: RequestOptions,
  ): Promise<Provider[]> {
    return this.request<Provider[]>('/providers', {
      method: 'GET',
      params: params as Record<string, any>,
      ...options,
    });
  }

  /**
   * GET /providers/:id
   * Retrieves single provider details, comprehensive cost range, and optional treatment estimate.
   *
   * @param id - Provider ID string
   * @param params - Optional query { treatmentId }
   */
  public async getProviderById(
    id: string,
    params?: GetProviderDetailQuery,
    options?: RequestOptions,
  ): Promise<Provider> {
    return this.request<Provider>(`/providers/${encodeURIComponent(id)}`, {
      method: 'GET',
      params: params as Record<string, any>,
      ...options,
    });
  }

  /**
   * PATCH /providers/:id/verification
   * Updates or audits provider credential verification status.
   * Requires ADMIN role.
   *
   * @param id - Provider ID string
   * @param data - { status, licenseDocumentUrl, notes, expiresAt }
   */
  public async updateProviderVerification(
    id: string,
    data: UpdateProviderVerificationRequest,
    options?: RequestOptions,
  ): Promise<Provider> {
    return this.request<Provider>(
      `/providers/${encodeURIComponent(id)}/verification`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
        ...options,
      },
    );
  }

  /**
   * POST /providers
   * Creates a new healthcare provider with status PENDING.
   * Requires ADMIN role.
   *
   * @param data - CreateProviderRequest
   */
  public async createProvider(
    data: CreateProviderRequest,
    options?: RequestOptions,
  ): Promise<Provider> {
    return this.request<Provider>('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // ─── Helpline Case Endpoints ─────────────────────────────────────────────────

  /**
   * POST /cases
   * Opens a new emergency concierge case for a traveler.
   */
  public async createCase(
    data: CreateCaseRequest,
    options?: RequestOptions,
  ): Promise<HelplineCaseResponse> {
    return this.request<HelplineCaseResponse>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * GET /cases/:id
   * Retrieves current case details, urgency status, and active provider recommendations.
   */
  public async getCaseById(
    id: string,
    options?: RequestOptions,
  ): Promise<HelplineCaseResponse> {
    return this.request<HelplineCaseResponse>(
      `/cases/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        ...options,
      },
    );
  }

  /**
   * PATCH /cases/:id/status
   * Advances case lifecycle: ASSIGNED -> RECOMMENDED -> RESOLVED -> CLOSED.
   * Requires HELPLINE_AGENT or ADMIN role.
   */
  public async updateCaseStatus(
    id: string,
    data: UpdateCaseStatusRequest,
    options?: RequestOptions,
  ): Promise<HelplineCaseResponse> {
    return this.request<HelplineCaseResponse>(
      `/cases/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
        ...options,
      },
    );
  }

  /**
   * GET /cases
   * Retrieves all emergency helpline cases, optionally filtered by status.
   */
  public async getCases(
    status?: string,
    options?: RequestOptions,
  ): Promise<HelplineCaseResponse[]> {
    return this.request<HelplineCaseResponse[]>('/cases', {
      method: 'GET',
      params: status ? { status } : undefined,
      ...options,
    });
  }

  // ─── Review Methods ──────────────────────────────────────────────────────────

  /**
   * GET /reviews
   * Retrieves reviews optionally filtered by providerId and status.
   */
  public async getReviews(
    params?: { providerId?: string; status?: ReviewStatus },
    options?: RequestOptions,
  ): Promise<Review[]> {
    return this.request<Review[]>('/reviews', {
      method: 'GET',
      params: params as any,
      ...options,
    });
  }

  /**
   * POST /reviews
   * Submits a new review for a RESOLVED case or COMPLETED appointment.
   * Review is created with status PENDING_MODERATION.
   */
  public async createReview(
    data: CreateReviewRequest,
    options?: RequestOptions,
  ): Promise<Review> {
    return this.request<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * PATCH /reviews/:id/status
   * Moderates a review: approves or hides it (Admin only).
   */
  public async moderateReview(
    id: string,
    status: 'APPROVED' | 'HIDDEN',
    options?: RequestOptions,
  ): Promise<ModerateReviewResponse> {
    return this.request<ModerateReviewResponse>(`/reviews/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      ...options,
    });
  }

  /**
   * PATCH /reviews/:id/approve (Admin only)
   */
  public async approveReview(
    id: string,
    options?: RequestOptions,
  ): Promise<ModerateReviewResponse> {
    return this.request<ModerateReviewResponse>(`/reviews/${id}/approve`, {
      method: 'PATCH',
      ...options,
    });
  }

  /**
   * PATCH /reviews/:id/hide (Admin only)
   */
  public async hideReview(
    id: string,
    options?: RequestOptions,
  ): Promise<ModerateReviewResponse> {
    return this.request<ModerateReviewResponse>(`/reviews/${id}/hide`, {
      method: 'PATCH',
      ...options,
    });
  }

  // ─── Grouped Namespaces (Convenient Fluent API) ──────────────────────────────

  public readonly health = {
    check: this.checkHealth.bind(this),
  };

  public readonly auth = {
    register: this.register.bind(this),
    login: this.login.bind(this),
    getProfile: this.getProfile.bind(this),
    checkAdmin: this.checkAdminAccess.bind(this),
    checkAgent: this.checkAgentAccess.bind(this),
    checkProviderStaff: this.checkProviderStaffAccess.bind(this),
  };

  public readonly providers = {
    list: this.getProviders.bind(this),
    getById: this.getProviderById.bind(this),
    updateVerification: this.updateProviderVerification.bind(this),
  };

  public readonly cases = {
    list: this.getCases.bind(this),
    create: this.createCase.bind(this),
    getById: this.getCaseById.bind(this),
    updateStatus: this.updateCaseStatus.bind(this),
  };

  public readonly reviews = {
    list: this.getReviews.bind(this),
    create: this.createReview.bind(this),
    moderate: this.moderateReview.bind(this),
    approve: this.approveReview.bind(this),
    hide: this.hideReview.bind(this),
  };
}

/** Default singleton API client instance */
export const apiClient = new ApiClient();
export default apiClient;
