import { Router } from 'express';
import { analyzeController } from '../controllers/analyzeController';

const router = Router();

router.post('/analyze', analyzeController.handleAnalyze);
router.get('/reports/:id', analyzeController.getReport);

export default router;
  