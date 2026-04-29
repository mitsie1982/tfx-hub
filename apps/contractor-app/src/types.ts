export type ContractorProject = {
  id: string;
  title: string;
  trade: string;
  location: string;
  budget: string;
  urgency: 'Urgent' | 'This week' | 'Flexible';
  posted: string;
  description: string;
  requirements: string[];
  leadType: string;
  matchScore: number;
  status: string;
  source: 'live' | 'sample';
};

export type LeadHistoryItem = {
  id: string;
  jobId: string;
  jobTitle: string;
  type: 'interest' | 'quote' | 'message';
  summary: string;
  createdAt: string;
  status: 'sent' | 'draft';
  source: 'live' | 'sample';
};

export type QuoteDraft = {
  amount: string;
  timeline: string;
  note: string;
};

export type MessageDraft = {
  body: string;
};

export type PendingProjectAction =
  | {
      type: 'quote';
      projectId: string;
      projectTitle: string;
      quote: QuoteDraft;
    }
  | {
      type: 'message';
      projectId: string;
      projectTitle: string;
      message: MessageDraft;
    };

export type LoginCredentials = {
  identifier: string;
  password: string;
};

export type RegistrationPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  trade: string;
};

export type PasswordResetPayload = {
  email: string;
  token: string;
  password: string;
};

export type ContractorProfile = {
  professionalId: string;
  name: string;
  trade: string;
  tier: string;
  rating: number;
  completedJobs: number;
  activeQuotes: number;
  responseTime: string;
};
