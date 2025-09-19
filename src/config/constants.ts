export const SCORING_WEIGHTS = {
  ROLE: {
    DECISION_MAKER: 20,
    INFLUENCER: 10,
    OTHER: 0
  },
  INDUSTRY: {
    EXACT_MATCH: 20,
    ADJACENT: 10,
    OTHER: 0
  },
  COMPLETENESS: {
    ALL_FIELDS: 10
  },
  AI: {
    HIGH: 50,
    MEDIUM: 30,
    LOW: 10
  }
};

export const DECISION_MAKER_ROLES = [
  'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CPO',
  'VP', 'Director', 'Head of', 'Chief', 'President',
  'Owner', 'Founder', 'Co-founder', 'Managing Director'
];

export const INFLUENCER_ROLES = [
  'Manager', 'Lead', 'Senior', 'Principal', 'Architect',
  'Consultant', 'Specialist', 'Advisor', 'Strategist'
];

export const ICP_INDUSTRIES = {
  EXACT: ['B2B SaaS', 'Software', 'Technology', 'SaaS'],
  ADJACENT: ['IT Services', 'Consulting', 'Digital Marketing', 'E-commerce', 'Fintech']
};

export const INTENT_THRESHOLDS = {
  HIGH: 70,
  MEDIUM: 40
};