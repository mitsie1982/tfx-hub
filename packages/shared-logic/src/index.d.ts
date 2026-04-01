export type ApiClientOptions = {
  baseURL?: string;
  getToken?: () => Promise<string | null | undefined> | string | null | undefined;
  onUnauthorized?: (error: unknown) => Promise<void> | void;
};

export type RequestContext = {
  associationId?: string;
  userId?: string;
  correlationId?: string;
  deviceId?: string;
  platform?: string;
  appVersion?: string;
};

export type SharedLogicClientOptions = ApiClientOptions & {
  context?: RequestContext;
};

export const JOB_STATUS: { OPEN: 'OPEN'; IN_PROGRESS: 'IN_PROGRESS'; COMPLETED: 'COMPLETED'; CANCELLED: 'CANCELLED' };
export const ONBOARDING_STAGES: string[];

export function createApiClient(options?: ApiClientOptions): unknown;
export function buildAssociationHeaders(context?: RequestContext): Record<string, string>;
export function mergeHeaders(...headerSets: Array<Record<string, string> | undefined>): Record<string, string>;
export function createJobsApi(client: unknown, context?: RequestContext): {
  listJobs(filters?: Record<string, string>): Promise<unknown>;
  getJob(jobId: string): Promise<unknown>;
  postJob(jobData: Record<string, unknown>): Promise<unknown>;
  applyForJob(jobId: string, application: Record<string, unknown>): Promise<unknown>;
};
export function createOnboardingApi(client: unknown, context?: RequestContext): {
  STAGES: string[];
  getStatus(): Promise<unknown>;
  submitStep(stage: string, data?: Record<string, unknown>): Promise<unknown>;
  currentStage(statusPayload: { completedStages: string[] }): string | null;
  isComplete(statusPayload: { completedStages: string[] }): boolean;
};
export function createProfessionalsApi(client: { get: (...args: unknown[]) => Promise<{ data: unknown }> }, context?: RequestContext): {
  listProfessionals(filters?: Record<string, string>): Promise<unknown>;
  getProfessional(professionalId: string): Promise<unknown>;
};
export function createSharedLogicClient(options?: SharedLogicClientOptions): {
  api: unknown;
  jobs: ReturnType<typeof createJobsApi>;
  onboarding: ReturnType<typeof createOnboardingApi>;
  professionals: ReturnType<typeof createProfessionalsApi>;
};

export const auth: {
  signToken(payload: Record<string, unknown>, opts?: Record<string, unknown>): string;
  verifyToken(token: string, opts?: Record<string, unknown>): Record<string, unknown>;
  tokenStore: {
    token: string | null;
    set(token: string): void;
    get(): string | null;
    clear(): void;
  };
  refreshToken(): Promise<null>;
};
