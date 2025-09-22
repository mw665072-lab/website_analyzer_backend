import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Example route

// Example route
app.get('/', (req, res) => {
  res.send('API is running');
});

// Import and use routes
import analyzeRouter from './routes/analyze';
import rankingRouter from './routes/ranking';
import redirectCheckerRouter from './routes/redirectChecker';

app.use('/api', rankingRouter);
app.use('/api', analyzeRouter);
app.use('/api', redirectCheckerRouter);

export default app;
