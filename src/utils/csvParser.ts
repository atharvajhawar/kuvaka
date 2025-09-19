import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { Lead } from '../types';
import { AppError } from '../middleware/errorHandler';
import logger from './logger';

export class CSVParser {
  /**
   * Parse CSV file and extract leads
   */
  async parseLeadsCSV(filePath: string): Promise<Lead[]> {
    return new Promise((resolve, reject) => {
      const leads: Lead[] = [];
      const requiredColumns = ['name', 'role', 'company', 'industry', 'location', 'linkedin_bio'];
      let headerValidated = false;

      createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headers: string[]) => {
          // Validate required columns
          const missingColumns = requiredColumns.filter(
            col => !headers.includes(col)
          );
          
          if (missingColumns.length > 0) {
            reject(new AppError(
              `Missing required columns: ${missingColumns.join(', ')}`,
              400
            ));
            return;
          }
          headerValidated = true;
        })
        .on('data', (row: any) => {
          if (!headerValidated) return;
          
          // Validate and clean lead data
          const lead: Lead = {
            name: (row.name || '').trim(),
            role: (row.role || '').trim(),
            company: (row.company || '').trim(),
            industry: (row.industry || '').trim(),
            location: (row.location || '').trim(),
            linkedin_bio: (row.linkedin_bio || '').trim()
          };
          
          // Only add lead if name is present (minimum requirement)
          if (lead.name) {
            leads.push(lead);
          }
        })
        .on('end', () => {
          logger.info(`Parsed ${leads.length} leads from CSV`);
          resolve(leads);
        })
        .on('error', (error: Error) => {
          logger.error('CSV parsing error:', error);
          reject(new AppError('Failed to parse CSV file', 400));
        });
    });
  }

  /**
   * Validate CSV file structure
   */
  validateCSVStructure(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const requiredColumns = ['name', 'role', 'company', 'industry', 'location', 'linkedin_bio'];
      
      createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headers: string[]) => {
          const hasAllColumns = requiredColumns.every(
            col => headers.includes(col)
          );
          resolve(hasAllColumns);
        })
        .on('error', () => {
          resolve(false);
        });
    });
  }
}