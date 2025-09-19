import { createObjectCsvWriter } from 'csv-writer';
import { ScoredLead } from '../types';
import path from 'path';
import logger from './logger';

export class CSVExporter {
  /**
   * Export scored leads to CSV file
   */
  async exportScoredLeads(scoredLeads: ScoredLead[], fileName?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFileName = fileName || `scored_leads_${timestamp}.csv`;
    const outputPath = path.join(process.cwd(), 'exports', outputFileName);

    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'role', title: 'Role' },
        { id: 'company', title: 'Company' },
        { id: 'industry', title: 'Industry' },
        { id: 'location', title: 'Location' },
        { id: 'linkedin_bio', title: 'LinkedIn Bio' },
        { id: 'intent', title: 'Intent' },
        { id: 'score', title: 'Total Score' },
        { id: 'rule_score', title: 'Rule Score' },
        { id: 'ai_score', title: 'AI Score' },
        { id: 'reasoning', title: 'AI Reasoning' }
      ]
    });

    try {
      await csvWriter.writeRecords(scoredLeads);
      logger.info(`Exported ${scoredLeads.length} scored leads to ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('CSV export error:', error);
      throw new Error('Failed to export CSV');
    }
  }
}