// ── Token storage ─────────────────────────────────────────────────────────────
const TOKEN_KEY = 'rashed_auth_token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

// ── HTTP client ───────────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',          // keep cookie fallback
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { error?: string };
      errorMsg = body.error ?? errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  const text = await res.text();
  return text ? JSON.parse(text) as T : {} as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface UserData {
  id: number;
  name: string;
  email: string;
  preferredLanguage: 'ar' | 'en';
  isDemoMode: boolean;
  householdId: number | null;
  createdAt: string;
}

interface AuthResponse {
  user: UserData;
  token: string;
}

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string; preferredLanguage?: 'ar' | 'en' }) =>
      request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<UserData>('/auth/me'),
    updateMe: (data: { name?: string; preferredLanguage?: 'ar' | 'en' }) =>
      request<UserData>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  household: {
    get: () => request<Household>('/household'),
    update: (data: Partial<HouseholdInput>) =>
      request<Household>('/household', { method: 'PUT', body: JSON.stringify(data) }),
    upsert: (data: Partial<HouseholdInput>) =>
      request<Household>('/household', { method: 'PUT', body: JSON.stringify(data) }),
    getMembers: () => request<HouseholdMember[]>('/household/members'),
    addMember: (data: { name: string; role?: string }) =>
      request<HouseholdMember>('/household/members', { method: 'POST', body: JSON.stringify(data) }),
    deleteMember: (id: number) =>
      request<{ success: boolean }>(`/household/members/${id}`, { method: 'DELETE' }),
  },

  meters: {
    list: () => request<Meter[]>('/meters'),
    create: (data: MeterInput) =>
      request<Meter>('/meters', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: number) => request<Meter>(`/meters/${id}`),
    update: (id: number, data: Partial<MeterInput>) =>
      request<Meter>(`/meters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  bills: {
    list: () => request<Bill[]>('/bills'),
    get: (id: number) => request<Bill>(`/bills/${id}`),
    upload: (form: FormData) =>
      request<UploadResult>('/bills/upload', { method: 'POST', body: form }),
  },

  dashboard: {
    summary: () => request<DashboardSummary>('/dashboard'),
    get: () => request<DashboardSummary>('/dashboard'),                    // alias used by Home.tsx
    latestAnalysis: () => request<Analysis>('/dashboard/analysis/latest'),
    getLatestAnalysis: () => request<Analysis>('/dashboard/analysis/latest'), // alias
  },

  assistant: {
    getConversations: () => request<Conversation[]>('/assistant/conversations'),
    createConversation: () =>
      request<Conversation>('/assistant/conversations', { method: 'POST', body: JSON.stringify({}) }),
    sendMessage: (convId: number, content: string, language: 'ar' | 'en' = 'ar') =>
      request<{ userMessage: Message; assistantMessage: Message }>(
        `/assistant/conversations/${convId}/messages`,
        { method: 'POST', body: JSON.stringify({ content, language }) },
      ),
    getMessages: (convId: number) =>
      request<Message[]>(`/assistant/conversations/${convId}/messages`),
  },

  savings: {
    list: () => request<SavingsEstimate[]>('/savings'),
    whatIf: (params: { reductionPercent: number }) =>
      request<WhatIfResult>('/savings/what-if', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },

  plan: {
    getRecommendations: () => request<Recommendation[]>('/plan/recommendations'),
    generate: (params: { goalPercent: number; language?: 'ar' | 'en' }) =>
      request<GeneratedPlan>('/plan/generate', { method: 'POST', body: JSON.stringify(params) }),
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Household {
  id: number;
  name: string;
  memberCount: number;
  propertyType: 'villa' | 'apartment' | 'townhouse' | 'other';
  bathroomCount: number;
  hasGarden: boolean;
  hasPool: boolean;
  propertySizeM2: number | null;
  createdAt: string;
  updatedAt: string;
}

export type HouseholdInput = Omit<Household, 'id' | 'createdAt' | 'updatedAt'>;

export interface HouseholdMember {
  id: number;
  householdId: number;
  name: string;
  role: string;
  createdAt: string;
}

export interface Meter {
  id: number;
  householdId: number;
  meterId: string;
  meterType: string;
  label: string | null;
  isActive: boolean;
  dataClassification: string;
  createdAt: string;
  lastReadingValue: number | null;
  lastReadingDate: string | null;
}

export type MeterInput = Omit<Meter, 'id' | 'householdId' | 'createdAt' | 'lastReadingValue' | 'lastReadingDate'>;

export interface Bill {
  id: number;
  householdId: number;
  fileName: string | null;
  documentType: string | null;
  currentConsumptionM3: number | null;
  previousConsumptionM3: number | null;
  billingPeriodDays: number | null;
  billAmountSar: number | null;
  extractionConfidence: number | null;
  extractionValid: boolean;
  isDemoData: boolean;
  createdAt: string;
}

export interface UploadResult {
  bill: Bill;
  valid: boolean;
  errors: string[];
  analysis: Analysis | null;
}

export interface Analysis {
  id: number;
  householdId: number;
  currentConsumptionM3: number | null;
  previousConsumptionM3: number | null;
  changePercentage: number | null;
  statusVsBaseline: string | null;
  baselineMinM3: number | null;
  baselineMaxM3: number | null;
  baselineBasis: string | null;
  anomalyDetected: boolean;
  smartAnalysisSummary: string | null;
  whyIncreasedSummary: string | null;
  possibleCauses: Array<{ reason: string; confidence: number }>;
  dataClassification: string;
  createdAt: string;
}

export interface LeakAlert {
  id: number;
  riskLevel: 'high' | 'medium' | 'low';
  probability: number;
  reason: string | null;
  isResolved: boolean;
  isDemo: boolean;
}

export interface Forecast {
  id: number;
  projectedM3: number;
  projectedMinM3: number | null;
  projectedMaxM3: number | null;
  confidenceNote: string | null;
  dataClassification: string;
}

export interface DashboardSummary {
  user: { name: string; preferredLanguage: 'ar' | 'en'; isDemoMode: boolean };
  household: Household | null;
  currentConsumptionM3: number | null;
  previousConsumptionM3: number | null;
  changePercentage: number | null;
  statusVsBaseline: string | null;
  baseline: { min: number; max: number } | null;
  gastatReferenceM3: number | null;
  activeAlert: LeakAlert | null;
  latestForecast: Forecast | null;
  recentConsumption: ConsumptionRecord[];
  hasData: boolean;
  needsHousehold?: boolean;
}

export interface ConsumptionRecord {
  id: number;
  periodStart: string;
  periodEnd: string;
  consumptionM3: number;
  billingPeriodDays: number | null;
  dataClassification: string;
}

export interface SavingsEstimate {
  id: number;
  currentCostSar: number;
  projectedCostSar: number;
  savingSar: number;
  savingM3: number;
  reductionPercent: number;
  tariffVersion: string;
  dataClassification: string;
}

export interface WhatIfResult {
  currentM3: number;
  targetM3: number;
  currentCostSar: number | null;
  targetCostSar: number | null;
  savingM3: number;
  savingSar: number;
  reductionPercent: number;
  annualSavingM3: number;
  annualSavingSar: number;
}

export interface Recommendation {
  id: number;
  householdId: number;
  analysisId: number | null;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  estimatedWaterSavingM3: number | null;
  estimatedCostSavingSar: number | null;
  priority: number;
  category: string;
  isCompleted: boolean;
  dataClassification: string;
  createdAt: string;
}

export interface PlanAction {
  id: number;
  icon: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  saving_m3: number;
  category: string;
  priority: number;
}

export interface GeneratedPlan {
  goalPercent: number;
  targetM3: number | null;
  savings: { currentCostSar: number; targetCostSar: number; savingSar: number; savingM3: number; reductionPercent: number } | null;
  actions: PlanAction[];
  summaryAr: string;
  summaryEn: string;
  tariffVersion: string | null;
  verificationStatus: string | null;
}

export interface Conversation {
  id: number;
  userId: number;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
