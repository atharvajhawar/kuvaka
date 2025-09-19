import { Lead, ScoringBreakdown } from '../types';
import { SCORING_WEIGHTS, DECISION_MAKER_ROLES, INFLUENCER_ROLES, ICP_INDUSTRIES } from '../config/constants';
import logger from '../utils/logger';

/**
 * Rule-Based Scoring Service
 *
 * Implements deterministic scoring logic based on predefined business rules.
 * This provides consistent, explainable scoring that doesn't require AI.
 *
 * Scoring components (max 50 points total):
 * - Role Score (20 points): Decision makers > Influencers > Others
 * - Industry Score (20 points): Exact ICP match > Adjacent > Others
 * - Completeness Score (10 points): Rewards complete lead profiles
 */
export class RuleScoringService {
  /**
   * Calculate rule-based score for a lead (max 50 points)
   */
  calculateRuleScore(lead: Lead): { score: number; breakdown: ScoringBreakdown } {
    const breakdown: ScoringBreakdown = {
      role_score: 0,
      industry_score: 0,
      completeness_score: 0,
      total_rule_score: 0
    };

    // Role relevance scoring (max 20 points)
    breakdown.role_score = this.scoreRole(lead.role);
    
    // Industry match scoring (max 20 points)
    breakdown.industry_score = this.scoreIndustry(lead.industry);
    
    // Data completeness scoring (max 10 points)
    breakdown.completeness_score = this.scoreCompleteness(lead);
    
    // Calculate total
    breakdown.total_rule_score = 
      breakdown.role_score + 
      breakdown.industry_score + 
      breakdown.completeness_score;

    logger.debug(`Rule scoring for ${lead.name}: ${JSON.stringify(breakdown)}`);

    return {
      score: breakdown.total_rule_score,
      breakdown
    };
  }

  /**
   * Score based on role relevance
   *
   * Decision makers (CEO, CTO, VP, Head, Director): 20 points
   * Influencers (Manager, Lead, Senior): 15 points
   * Others: 5 points
   *
   * Uses case-insensitive partial matching to handle role variations
   */
  private scoreRole(role: string): number {
    if (!role) return SCORING_WEIGHTS.ROLE.OTHER;
    
    const roleUpper = role.toUpperCase();
    
    // Check for decision maker roles
    const isDecisionMaker = DECISION_MAKER_ROLES.some(dmRole => 
      roleUpper.includes(dmRole.toUpperCase())
    );
    
    if (isDecisionMaker) {
      return SCORING_WEIGHTS.ROLE.DECISION_MAKER;
    }
    
    // Check for influencer roles
    const isInfluencer = INFLUENCER_ROLES.some(infRole => 
      roleUpper.includes(infRole.toUpperCase())
    );
    
    if (isInfluencer) {
      return SCORING_WEIGHTS.ROLE.INFLUENCER;
    }
    
    return SCORING_WEIGHTS.ROLE.OTHER;
  }

  /**
   * Score based on industry match
   *
   * Exact ICP match (B2B SaaS, Software, Technology): 20 points
   * Adjacent industries (Fintech, E-commerce, etc): 10 points
   * Other industries: 5 points
   *
   * Industries are configured in constants for easy customization
   */
  private scoreIndustry(industry: string): number {
    if (!industry) return SCORING_WEIGHTS.INDUSTRY.OTHER;
    
    const industryUpper = industry.toUpperCase();
    
    // Check for exact ICP match
    const isExactMatch = ICP_INDUSTRIES.EXACT.some(icpIndustry => 
      industryUpper.includes(icpIndustry.toUpperCase())
    );
    
    if (isExactMatch) {
      return SCORING_WEIGHTS.INDUSTRY.EXACT_MATCH;
    }
    
    // Check for adjacent industry
    const isAdjacent = ICP_INDUSTRIES.ADJACENT.some(adjIndustry => 
      industryUpper.includes(adjIndustry.toUpperCase())
    );
    
    if (isAdjacent) {
      return SCORING_WEIGHTS.INDUSTRY.ADJACENT;
    }
    
    return SCORING_WEIGHTS.INDUSTRY.OTHER;
  }

  /**
   * Score based on data completeness
   *
   * Complete profile (all 6 fields): 10 points
   * Incomplete profile: 0 points
   *
   * Encourages quality data collection and rewards thorough lead research
   */
  private scoreCompleteness(lead: Lead): number {
    const fields = [
      lead.name,
      lead.role,
      lead.company,
      lead.industry,
      lead.location,
      lead.linkedin_bio
    ];
    
    const allFieldsPresent = fields.every(field => 
      field && field.trim().length > 0
    );
    
    return allFieldsPresent ? SCORING_WEIGHTS.COMPLETENESS.ALL_FIELDS : 0;
  }
}