import { Router } from 'express';
import { redirectCheckerController } from '../controllers/redirectCheckerController';

const router = Router();

router.post('/seoWebsiteAnalyzer', redirectCheckerController.handleRedirectCheck);

export default router;