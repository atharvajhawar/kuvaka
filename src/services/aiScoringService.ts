import OpenAI from 'openai';
import { Lead, Offer } from '../types';
import { SCORING_WEIGHTS } from '../config/constants';
import logger from '../utils/logger';

export class AIScoringService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || 'sk-placeholder';
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  /**
   * Get AI-based score and reasoning for a lead (max 50 points)
   */
  async scoreWithAI(
    lead: Lead,
    offer: Offer
  ): Promise<{ score: number; intent: 'High' | 'Medium' | 'Low'; reasoning: string }> {
    try {
      // Check if API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        logger.warn('OpenAI API key not configured, using fallback scoring');
        return this.fallbackScoring(lead, offer);
      }

      const prompt = this.buildPrompt(lead, offer);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert B2B sales qualification specialist. Analyze prospects and classify their buying intent accurately.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      const response = completion.choices[0]?.message?.content || '';
      const parsed = this.parseAIResponse(response);
      
      logger.debug(`AI scoring for ${lead.name}: ${JSON.stringify(parsed)}`);
      
      return parsed;
    } catch (error) {
      logger.error('AI scoring error:', error);
      // Fallback to medium score if AI fails
      return {
        score: SCORING_WEIGHTS.AI.MEDIUM,
        intent: 'Medium',
        reasoning: 'Unable to determine intent via AI analysis'
      };
    }
  }

  /**
   * Build the prompt for AI analysis
   */
  private buildPrompt(lead: Lead, offer: Offer): string {
    return `
Analyze this prospect for the following product/offer:

PRODUCT/OFFER:
- Name: ${offer.name}
- Value Props: ${offer.value_props.join(', ')}
- Ideal Use Cases: ${offer.ideal_use_cases.join(', ')}

PROSPECT:
- Name: ${lead.name}
- Role: ${lead.role}
- Company: ${lead.company}
- Industry: ${lead.industry}
- Location: ${lead.location}
- LinkedIn Bio: ${lead.linkedin_bio}

Based on the prospect's role, industry, and LinkedIn bio, classify their buying intent as High, Medium, or Low.

Consider:
1. Role alignment with decision-making authority
2. Industry fit with ideal use cases
3. LinkedIn bio indicators of relevant pain points or initiatives
4. Company and location factors

Respond in this exact format:
INTENT: [High/Medium/Low]
REASONING: [1-2 sentences explaining your classification]
`;
  }

  /**
   * Parse AI response and extract intent and reasoning
   */
  private parseAIResponse(response: string): {
    score: number;
    intent: 'High' | 'Medium' | 'Low';
    reasoning: string;
  } {
    const lines = response.split('\n');
    let intent: 'High' | 'Medium' | 'Low' = 'Medium';
    let reasoning = 'AI analysis completed';

    for (const line of lines) {
      if (line.startsWith('INTENT:')) {
        const intentStr = line.replace('INTENT:', '').trim();
        if (intentStr.includes('High')) intent = 'High';
        else if (intentStr.includes('Low')) intent = 'Low';
        else intent = 'Medium';
      } else if (line.startsWith('REASONING:')) {
        reasoning = line.replace('REASONING:', '').trim();
      }
    }

    // Map intent to score
    const scoreMap = {
      'High': SCORING_WEIGHTS.AI.HIGH,
      'Medium': SCORING_WEIGHTS.AI.MEDIUM,
      'Low': SCORING_WEIGHTS.AI.LOW
    };

    return {
      score: scoreMap[intent],
      intent,
      reasoning
    };
  }

  /**
   * Fallback scoring when AI is not available
   */
  private fallbackScoring(lead: Lead, offer: Offer): {
    score: number;
    intent: 'High' | 'Medium' | 'Low';
    reasoning: string;
  } {
    // Simple heuristic-based scoring
    let score = SCORING_WEIGHTS.AI.MEDIUM;
    let intent: 'High' | 'Medium' | 'Low' = 'Medium';

    // Check for high-value indicators
    const highValueKeywords = ['scale', 'growth', 'automation', 'AI', 'efficiency', 'productivity'];
    const bioLower = lead.linkedin_bio.toLowerCase();

    const hasHighValueKeywords = highValueKeywords.some(keyword =>
      bioLower.includes(keyword.toLowerCase())
    );

    if (hasHighValueKeywords && lead.industry.toLowerCase().includes('saas')) {
      score = SCORING_WEIGHTS.AI.HIGH;
      intent = 'High';
    } else if (!hasHighValueKeywords && !lead.industry.toLowerCase().includes('tech')) {
      score = SCORING_WEIGHTS.AI.LOW;
      intent = 'Low';
    }

    return {
      score,
      intent,
      reasoning: `Based on profile analysis: ${lead.role} in ${lead.industry} industry.`
    };
  }
}