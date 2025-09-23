import { Router } from 'express';
import aiAnalyzerController from '../controllers/aiAnalyzerController';

const router = Router();

// POST /api/aiAnalyze
router.post('/aiAnalyze', aiAnalyzerController.handleAnalyze);

export default router;
