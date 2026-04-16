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

export function cloneDemoSeed<T>(value: T): T;
export function getHumanFacingDemoSeed(): Record<string, unknown>;

export const JOB_STATUS: { OPEN: 'OPEN'; IN_PROGRESS: 'IN_PROGRESS'; COMPLETED: 'COMPLETED'; CANCELLED: 'CANCELLED' };
export const ONBOARDING_STAGES: string[];

export function createApiClient(options?: ApiClientOptions): unknown;
export function createAdminApi(client: unknown, context?: RequestContext): {
  listAccounts(): Promise<unknown>;
  createAccount(payload: Record<string, unknown>): Promise<unknown>;
  rotateCredentials(adminUserId: string, payload: Record<string, unknown>): Promise<unknown>;
  requestPasswordReset(adminUserId: string): Promise<unknown>;
  listAuditEvents(filters?: Record<string, unknown>): Promise<unknown>;
  exportAuditEvents(filters?: Record<string, unknown>): Promise<string>;
};
export function buildAssociationHeaders(context?: RequestContext): Record<string, string>;
export function mergeHeaders(...headerSets: Array<Record<string, string> | undefined>): Record<string, string>;
export function createContractorApi(client: unknown, context?: RequestContext): {
  getProfile(): Promise<unknown>;
  listLeadHistory(): Promise<unknown>;
  submitQuote(jobId: string, quote: Record<string, unknown>): Promise<unknown>;
  sendMessage(jobId: string, message: Record<string, unknown>): Promise<unknown>;
};
export function createSessionApi(client: unknown, context?: RequestContext): {
  login(credentials: { email: string; password: string }): Promise<unknown>;
  register(payload: Record<string, unknown>): Promise<unknown>;
  requestPasswordReset(payload: { email: string }): Promise<unknown>;
  confirmPasswordReset(payload: { token: string; password: string }): Promise<unknown>;
  getCurrentUser(): Promise<unknown>;
  subscribeWhatsapp(phoneNumber: string): Promise<unknown>;
};
export function createWhatsappContractorApi(client: unknown, context?: RequestContext): {
  getSession(phoneNumber: string): Promise<unknown>;
  sendMessage(phoneNumber: string, message: string): Promise<unknown>;
};
export function createWhatsappAssociationApi(client: unknown, context?: RequestContext): {
  getSession(phoneNumber: string): Promise<unknown>;
  sendMessage(phoneNumber: string, message: string): Promise<unknown>;
};
export function createWhatsappAdminApi(client: unknown, context?: RequestContext): {
  getSession(phoneNumber: string): Promise<unknown>;
  sendMessage(phoneNumber: string, message: string): Promise<unknown>;
};
export function createWhatsappCustomerApi(client: unknown, context?: RequestContext): {
  getSession(phoneNumber: string): Promise<unknown>;
  sendMessage(phoneNumber: string, message: string): Promise<unknown>;
};
export function createWhatsappProfessionalApi(client: unknown, context?: RequestContext): {
  getSession(phoneNumber: string): Promise<unknown>;
  sendMessage(phoneNumber: string, message: string): Promise<unknown>;
};
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
  listAdminActions(professionalId: string): Promise<unknown>;
  runAdminAction(professionalId: string, actionType: string, payload?: Record<string, unknown>): Promise<unknown>;
  listOperationalActions(professionalId: string): Promise<unknown>;
  runOperationalAction(professionalId: string, actionType: string, payload?: Record<string, unknown>): Promise<unknown>;
};
export function createSharedLogicClient(options?: SharedLogicClientOptions): {
  api: unknown;
  admin: ReturnType<typeof createAdminApi>;
  contractor: ReturnType<typeof createContractorApi>;
  jobs: ReturnType<typeof createJobsApi>;
  onboarding: ReturnType<typeof createOnboardingApi>;
  professionals: ReturnType<typeof createProfessionalsApi>;
  session: ReturnType<typeof createSessionApi>;
  whatsappAssociation: ReturnType<typeof createWhatsappAssociationApi>;
  whatsappAdmin: ReturnType<typeof createWhatsappAdminApi>;
  whatsappContractor: ReturnType<typeof createWhatsappContractorApi>;
  whatsappCustomer: ReturnType<typeof createWhatsappCustomerApi>;
  whatsappProfessional: ReturnType<typeof createWhatsappProfessionalApi>;
};

export const auth: {
  signToken(payload: Record<string, unknown>, opts?: Record<string, unknown>): string;
  verifyToken(token: string, opts?: Record<string, unknown>): Record<string, unknown>;
  refreshToken(): Promise<null>;
  tokenStore: {
    token: string | null;
    set(token: string): void;
    get(): string | null;
    clear(): void;
    hydrate(): Promise<string | null>;
    setPersistence(adapter: { get?: () => Promise<string | null>; set?: (token: string) => Promise<void> | void; clear?: () => Promise<void> | void } | null): void;
  };
};
