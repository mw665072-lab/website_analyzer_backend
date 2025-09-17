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
app.use('/api', analyzeRouter);


const MONGODB_URI = process.env.DB_HOST || 'mongodb://localhost:27017/analyzer';

// mongoose.connect(MONGODB_URI)
//   .then(() => console.log('MongoDB connected'))
//   .catch(err => {
//     console.error('MongoDB connection error:', err);
//     process.exit(1);
//   });


export default app;
