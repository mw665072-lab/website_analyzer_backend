import { Router } from 'express';
import { redirectCheckerController } from '../controllers/redirectCheckerController';

const router = Router();

router.post('/redirect-check', redirectCheckerController.handleRedirectCheck);

export default router;