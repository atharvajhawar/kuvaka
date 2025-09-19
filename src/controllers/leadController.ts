import { Request, Response } from 'express';
import { Lead, ScoredLead } from '../types';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { CSVParser } from '../utils/csvParser';
import { CSVExporter } from '../utils/csvExporter';
import { LeadScoringService } from '../services/leadScoringService';
import { OfferController } from './offerController';
import logger from '../utils/logger';
import { unlink } from 'fs/promises';
import path from 'path';

export class LeadController {
  private csvParser: CSVParser;
  private csvExporter: CSVExporter;
  private leadScoringService: LeadScoringService;
  private offerController: OfferController;
  private uploadedLeads: Lead[] = [];
  private scoredLeads: ScoredLead[] = [];

  constructor(offerController: OfferController) {
    this.csvParser = new CSVParser();
    this.csvExporter = new CSVExporter();
    this.leadScoringService = new LeadScoringService();
    this.offerController = offerController;
  }

  /**
   * POST /leads/upload - Upload CSV file with leads
   */
  uploadLeads = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const filePath = req.file.path;

    try {
      // Parse CSV file
      const leads = await this.csvParser.parseLeadsCSV(filePath);
      
      if (leads.length === 0) {
        throw new AppError('CSV file contains no valid leads', 400);
      }
      
      // Store leads
      this.uploadedLeads = leads;
      
      // Clean up uploaded file
      await unlink(filePath);
      
      logger.info(`Uploaded ${leads.length} leads`);
      
      res.json({
        success: true,
        message: `Successfully uploaded ${leads.length} leads`,
        data: {
          count: leads.length,
          sample: leads.slice(0, 3) // Show first 3 leads as sample
        }
      });
    } catch (error) {
      // Clean up file on error
      await unlink(filePath).catch(() => {});
      throw error;
    }
  });

  /**
   * POST /score - Score uploaded leads
   */
  scoreLeads = asyncHandler(async (req: Request, res: Response) => {
    // Check if we have leads
    if (this.uploadedLeads.length === 0) {
      throw new AppError('No leads uploaded. Please upload leads first.', 400);
    }
    
    // Check if we have an offer
    const offer = this.offerController.getCurrentOffer();
    if (!offer) {
      throw new AppError('No offer found. Please create an offer first.', 400);
    }
    
    // Score all leads
    logger.info(`Starting scoring for ${this.uploadedLeads.length} leads`);
    
    const scoredLeads = await this.leadScoringService.scoreLeads(
      this.uploadedLeads,
      offer
    );
    
    // Store scored leads
    this.scoredLeads = scoredLeads;
    
    // Calculate statistics
    const stats = {
      total: scoredLeads.length,
      high: scoredLeads.filter(l => l.intent === 'High').length,
      medium: scoredLeads.filter(l => l.intent === 'Medium').length,
      low: scoredLeads.filter(l => l.intent === 'Low').length,
      averageScore: Math.round(
        scoredLeads.reduce((sum, l) => sum + l.score, 0) / scoredLeads.length
      )
    };
    
    logger.info(`Scoring complete: ${JSON.stringify(stats)}`);
    
    res.json({
      success: true,
      message: 'Leads scored successfully',
      data: {
        stats,
        topLeads: scoredLeads.slice(0, 5) // Show top 5 leads
      }
    });
  });

  /**
   * GET /results - Get scoring results
   */
  getResults = asyncHandler(async (req: Request, res: Response) => {
    if (this.scoredLeads.length === 0) {
      throw new AppError('No scored leads available. Please score leads first.', 404);
    }
    
    res.json({
      success: true,
      data: this.scoredLeads
    });
  });

  /**
   * GET /export/csv - Export results as CSV
   */
  exportResultsCSV = asyncHandler(async (req: Request, res: Response) => {
    if (this.scoredLeads.length === 0) {
      throw new AppError('No scored leads available to export.', 404);
    }
    
    // Create exports directory if it doesn't exist
    const exportDir = path.join(process.cwd(), 'exports');
    await import('fs').then(fs => {
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
    });
    
    // Export to CSV
    const filePath = await this.csvExporter.exportScoredLeads(this.scoredLeads);
    
    // Send file as download
    res.download(filePath, 'scored_leads.csv', (err) => {
      if (err) {
        logger.error('Error sending CSV file:', err);
      }
      // Clean up file after sending
      unlink(filePath).catch(() => {});
    });
  });
}