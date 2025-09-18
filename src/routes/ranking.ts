import { Router } from 'express';
import { RankingController } from '../controllers/rankingController';

const router = Router();

router.post('/ranking', RankingController.getRanking);

export default router;
