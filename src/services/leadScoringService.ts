import { Lead, Offer, ScoredLead } from '../types';
import { RuleScoringService } from './ruleScoringService';
import { AIScoringService } from './aiScoringService';
import { INTENT_THRESHOLDS } from '../config/constants';
import logger from '../utils/logger';

/**
 * Lead Scoring Service
 *
 * This service orchestrates the lead scoring process by combining:
 * 1. Rule-based scoring (50 points max): Evaluates lead attributes against predefined criteria
 * 2. AI-based scoring (50 points max): Uses OpenAI GPT to analyze lead-offer fit
 *
 * Total score ranges from 0-100, with intent levels:
 * - High: 70+ points (strong buying signals)
 * - Medium: 40-69 points (potential interest)
 * - Low: <40 points (minimal fit)
 */
export class LeadScoringService {
  private ruleScoringService: RuleScoringService;
  private aiScoringService: AIScoringService;

  constructor() {
    this.ruleScoringService = new RuleScoringService();
    this.aiScoringService = new AIScoringService();
  }

  /**
   * Score a single lead using both rule-based and AI scoring
   *
   * @param lead - The lead to be scored with all profile information
   * @param offer - The product/service offer to evaluate against
   * @returns Scored lead with total score, intent level, and reasoning
   *
   * Scoring methodology:
   * - Rule score evaluates: role seniority, industry match, company size indicators
   * - AI score analyzes: bio keywords, offer-lead fit, buying intent signals
   */
  async scoreLead(lead: Lead, offer: Offer): Promise<ScoredLead> {
    // Get rule-based score (max 50 points)
    const { score: ruleScore } = this.ruleScoringService.calculateRuleScore(lead);
    
    // Get AI-based score and reasoning (max 50 points)
    const { score: aiScore, intent: aiIntent, reasoning } = 
      await this.aiScoringService.scoreWithAI(lead, offer);
    
    // Calculate total score (max 100 points)
    const totalScore = ruleScore + aiScore;
    
    // Determine final intent based on total score
    const finalIntent = this.determineIntent(totalScore);
    
    const scoredLead: ScoredLead = {
      ...lead,
      score: totalScore,
      intent: finalIntent,
      reasoning,
      rule_score: ruleScore,
      ai_score: aiScore
    };
    
    logger.info(`Scored lead ${lead.name}: ${totalScore} (${finalIntent})`);
    
    return scoredLead;
  }

  /**
   * Score multiple leads in batch
   *
   * @param leads - Array of leads to score
   * @param offer - The offer to evaluate against
   * @returns Array of scored leads sorted by score (highest first)
   *
   * Features:
   * - Handles scoring errors gracefully with fallback scores
   * - Automatically sorts results by score for easy prioritization
   * - Logs all scoring operations for debugging
   */
  async scoreLeads(leads: Lead[], offer: Offer): Promise<ScoredLead[]> {
    const scoredLeads: ScoredLead[] = [];
    
    for (const lead of leads) {
      try {
        const scoredLead = await this.scoreLead(lead, offer);
        scoredLeads.push(scoredLead);
      } catch (error) {
        logger.error(`Error scoring lead ${lead.name}:`, error);
        // Add lead with default medium score if scoring fails
        scoredLeads.push({
          ...lead,
          score: 40,
          intent: 'Medium',
          reasoning: 'Error during scoring process',
          rule_score: 20,
          ai_score: 20
        });
      }
    }
    
    // Sort by score (highest first)
    scoredLeads.sort((a, b) => b.score - a.score);
    
    return scoredLeads;
  }

  /**
   * Determine intent based on total score
   *
   * @param score - Total score (0-100)
   * @returns Intent level classification
   *
   * Thresholds:
   * - High: 70+ (ready to buy, strong fit)
   * - Medium: 40-69 (interested, needs nurturing)
   * - Low: <40 (poor fit, not ready)
   */
  private determineIntent(score: number): 'High' | 'Medium' | 'Low' {
    if (score >= INTENT_THRESHOLDS.HIGH) {
      return 'High';
    } else if (score >= INTENT_THRESHOLDS.MEDIUM) {
      return 'Medium';
    } else {
      return 'Low';
    }
  }
}