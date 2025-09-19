import { Request, Response } from 'express';
import { z } from 'zod';
import { Offer } from '../types';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

// Validation schema for offer
const offerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value_props: z.array(z.string()).min(1, 'At least one value proposition is required'),
  ideal_use_cases: z.array(z.string()).min(1, 'At least one ideal use case is required')
});

export class OfferController {
  private currentOffer: Offer | null = null;

  /**
   * POST /offer - Store product/offer details
   */
  createOffer = asyncHandler(async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = offerSchema.parse(req.body);
      
      // Store the offer
      this.currentOffer = validatedData;
      
      logger.info(`Offer created: ${validatedData.name}`);
      
      res.status(201).json({
        success: true,
        message: 'Offer created successfully',
        data: this.currentOffer
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(
          `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }
      throw error;
    }
  });

  /**
   * GET /offer - Retrieve current offer
   */
  getOffer = asyncHandler(async (req: Request, res: Response) => {
    if (!this.currentOffer) {
      throw new AppError('No offer found. Please create an offer first.', 404);
    }
    
    res.json({
      success: true,
      data: this.currentOffer
    });
  });

  /**
   * Get current offer (internal use)
   */
  getCurrentOffer(): Offer | null {
    return this.currentOffer;
  }
}