const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
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
  createdAt: string;
}

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string; preferredLanguage?: 'ar' | 'en' }) =>
      request<UserData>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<UserData>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<UserData>('/auth/me'),
    updateMe: (data: { name?: string; preferredLanguage?: 'ar' | 'en' }) =>
      request<UserData>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  dashboard: {
    get: () => request<DashboardData>('/dashboard'),
    getLatestAnalysis: () => request<Analysis>('/dashboard/analysis/latest'),
  },

  household: {
    get: () => request<Household>('/household'),
    upsert: (data: UpsertHouseholdData) =>
      request<Household>('/household', { method: 'PUT', body: JSON.stringify(data) }),
    getMembers: () => request<HouseholdMember[]>('/household/members'),
    addMember: (data: { name: string; role?: string }) =>
      request<HouseholdMember>('/household/members', { method: 'POST', body: JSON.stringify(data) }),
    removeMember: (id: number) =>
      request<void>(`/household/members/${id}`, { method: 'DELETE' }),
  },

  meters: {
    list: () => request<Meter[]>('/meters'),
    create: (data: { meterId: string; meterType: string; label?: string }) =>
      request<Meter>('/meters', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: number) => request<Meter>(`/meters/${id}`),
    update: (id: number, data: { label?: string; isActive?: boolean }) =>
      request<Meter>(`/meters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  bills: {
    list: () => request<Bill[]>('/bills'),
    get: (id: number) => request<Bill>(`/bills/${id}`),
    upload: (formData: FormData) =>
      fetch(`${BASE}/bills/upload`, { method: 'POST', credentials: 'include', body: formData })
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json() as { error?: string };
            throw new Error(body.error ?? `HTTP ${res.status}`);
          }
          return res.json() as Promise<UploadResult>;
        }),
  },

  savings: {
    list: () => request<SavingsEstimate[]>('/savings'),
    whatIf: (data: { targetM3?: number; reductionPercent?: number }) =>
      request<WhatIfResult>('/savings/what-if', { method: 'POST', body: JSON.stringify(data) }),
  },

  assistant: {
    getConversations: () => request<Conversation[]>('/assistant/conversations'),
    createConversation: (title?: string) =>
      request<Conversation>('/assistant/conversations', { method: 'POST', body: JSON.stringify({ title }) }),
    getMessages: (id: number) => request<Message[]>(`/assistant/conversations/${id}/messages`),
    sendMessage: (id: number, content: string, language: 'ar' | 'en') =>
      request<{ userMessage: Message; assistantMessage: Message }>(
        `/assistant/conversations/${id}/messages`,
        { method: 'POST', body: JSON.stringify({ content, language }) }
      ),
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DashboardData {
  needsHousehold?: boolean;
  user?: { name: string; preferredLanguage: 'ar' | 'en'; isDemoMode: boolean };
  household?: Household;
  currentConsumptionM3?: number | null;
  previousConsumptionM3?: number | null;
  changePercentage?: number | null;
  statusVsBaseline?: string | null;
  baseline?: { min: number; max: number; basis: string } | null;
  gastatReferenceM3?: number | null;
  activeAlert?: LeakAlert | null;
  latestForecast?: Forecast | null;
  recentConsumption?: ConsumptionRecord[];
  hasData?: boolean;
}

export interface Household {
  id: number;
  name: string;
  memberCount: number;
  propertyType: 'villa' | 'apartment' | 'townhouse' | 'other';
  bathroomCount: number;
  hasGarden: boolean;
  hasPool: boolean;
  propertySizeM2?: number | null;
  createdAt: string;
}

export interface UpsertHouseholdData {
  name: string;
  memberCount: number;
  propertyType: 'villa' | 'apartment' | 'townhouse' | 'other';
  bathroomCount: number;
  hasGarden: boolean;
  hasPool: boolean;
  propertySizeM2?: number | null;
}

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
  meterType: 'main' | 'garden' | 'pool' | 'other';
  label?: string | null;
  isActive: boolean;
  lastReadingValue?: number | null;
  lastReadingDate?: string | null;
  dataClassification: string;
  createdAt: string;
}

export interface Bill {
  id: number;
  householdId: number;
  currentConsumptionM3?: number | null;
  previousConsumptionM3?: number | null;
  billingPeriodDays?: number | null;
  billAmountSar?: number | null;
  extractionConfidence?: number | null;
  extractionValid?: boolean | null;
  isDemoData: boolean;
  createdAt: string;
}

export interface Analysis {
  id: number;
  householdId: number;
  currentConsumptionM3?: number | null;
  previousConsumptionM3?: number | null;
  changePercentage?: number | null;
  baselineMinM3?: number | null;
  baselineMaxM3?: number | null;
  baselineBasis?: string | null;
  statusVsBaseline?: string | null;
  anomalyDetected?: boolean | null;
  smartAnalysisSummary?: string | null;
  whyIncreasedSummary?: string | null;
  possibleCauses?: { reason: string; confidence: number }[] | null;
  dataClassification: string;
  createdAt: string;
}

export interface LeakAlert {
  id: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  probability?: number | null;
  reason: string;
  isDemo: boolean;
  isResolved: boolean;
  createdAt: string;
}

export interface Forecast {
  id: number;
  projectedM3: number;
  projectedMinM3?: number | null;
  projectedMaxM3?: number | null;
  confidenceNote?: string | null;
  dataClassification: string;
  createdAt: string;
}

export interface ConsumptionRecord {
  id: number;
  consumptionM3: number;
  periodStart: string;
  periodEnd: string;
  dataClassification: string;
}

export interface SavingsEstimate {
  id: number;
  tariffVersion: string;
  periodLabel: string;
  currentCostSar: number;
  projectedCostSar: number;
  savingSar: number;
  savingM3: number;
  reductionPercent: number;
  dataClassification: string;
  createdAt: string;
}

export interface WhatIfResult {
  currentM3: number;
  targetM3: number;
  currentCostSar: number;
  targetCostSar: number;
  savingSar: number;
  savingM3: number;
  reductionPercent: number;
  annualSavingSar: number;
  annualSavingM3: number;
  tariffVersion: string;
  verificationStatus: string;
}

export interface Conversation {
  id: number;
  userId: number;
  title?: string | null;
  createdAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface UploadResult {
  bill: Bill;
  valid: boolean;
  errors: string[];
  analysis: Analysis | null;
}
