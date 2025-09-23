import { Router } from 'express';
import { seoWebsiteAnalyzerController } from '../controllers/seoWebsiteAnalyzer';

const router = Router();

router.post('/seoWebsiteAnalyzer', seoWebsiteAnalyzerController.seoHandleAnalyze);

export default router;