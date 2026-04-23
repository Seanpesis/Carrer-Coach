export type Plan = "free" | "pro" | "team";

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  plan: Plan;
  stripe_customer_id?: string;
  created_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  storage_url: string;
  pinecone_namespace: string;
  raw_text?: string;
  created_at: string;
}

export interface JobApplication {
  id: string;
  user_id: string;
  resume_id: string;
  company: string;
  role: string;
  job_description: string;
  jd_keywords: string[];
  match_score: number | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  application_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface AuditReport {
  match_score: number;
  missing_keywords: string[];
  strong_sections: string[];
  weak_sections: string[];
  recommended_rewrites: {
    original: string;
    improved: string;
    reason: string;
  }[];
  summary: string;
}

export const PLAN_LIMITS: Record<Plan, { resumes: number; applications: number; messages: number }> = {
  free: { resumes: 1, applications: 3, messages: 20 },
  pro: { resumes: Infinity, applications: Infinity, messages: 500 },
  team: { resumes: Infinity, applications: Infinity, messages: Infinity },
};
