export interface Offer {
  name: string;
  value_props: string[];
  ideal_use_cases: string[];
}

export interface Lead {
  name: string;
  role: string;
  company: string;
  industry: string;
  location: string;
  linkedin_bio: string;
}

export interface ScoredLead extends Lead {
  intent: 'High' | 'Medium' | 'Low';
  score: number;
  reasoning: string;
  rule_score: number;
  ai_score: number;
}

export interface ScoringBreakdown {
  role_score: number;
  industry_score: number;
  completeness_score: number;
  total_rule_score: number;
}