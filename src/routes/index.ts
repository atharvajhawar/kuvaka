import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { OfferController } from '../controllers/offerController';
import { LeadController } from '../controllers/leadController';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize controllers
const offerController = new OfferController();
const leadController = new LeadController(offerController);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'lead-qualification-api',
    timestamp: new Date().toISOString() 
  });
});

// Offer routes
router.post('/offer', offerController.createOffer);
router.get('/offer', offerController.getOffer);

// Lead routes
router.post('/leads/upload', upload.single('file'), leadController.uploadLeads);
router.post('/score', leadController.scoreLeads);
router.get('/results', leadController.getResults);
router.get('/export/csv', leadController.exportResultsCSV);

export default router;