import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  url: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  metadata?: {
    title?: string;
    metaDescription?: string;
    og?: Record<string, any>;
    h1s?: string[];
    headings?: string[];
  };
  performance?: {
    lighthouseScore?: number;
    metrics?: Record<string, any>;
  };
  colors?: Array<{ hex: string; population: number }>;
  screenshot?: string;
  ai?: {
    summary?: string;
    seoIssues?: any[];
    performanceRecommendations?: any[];
    designSuggestions?: any[];
  };
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReportSchema = new Schema<IReport>({
  url: { type: String, required: true },
  status: { type: String, enum: ['queued','processing','done','failed'], default: 'queued' },
  metadata: {
    title: String,
    metaDescription: String,
    og: Schema.Types.Mixed,
    h1s: [String],
    headings: [String],
  },
  performance: {
    lighthouseScore: Number,
    metrics: Schema.Types.Mixed,
  },
  colors: [{ hex: String, population: Number }],
  screenshot: String,
  ai: {
    summary: String,
    seoIssues: [Schema.Types.Mixed],
    performanceRecommendations: [Schema.Types.Mixed],
    designSuggestions: [Schema.Types.Mixed],
  },
  error: String,
}, { timestamps: true });

ReportSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model<IReport>('Report', ReportSchema);
