import { Worker } from 'bullmq';
import Report from '../models/Report';
import { cache } from '../utils/cache';
import { analyzeUrl } from '../utils/analyzeUrl';

const worker = new Worker('analyze', async job => {
  const { reportId, url, options } = job.data;
  await Report.findByIdAndUpdate(reportId, { status: 'processing' });
  try {
    // Run the actual website analysis
    const result = await analyzeUrl(url);
    await Report.findByIdAndUpdate(reportId, { status: 'done', result });
    await cache.setReport(url, result, 3600);
  } catch (err) {
    let errorMsg = 'Unknown error';
    if (err instanceof Error) {
      errorMsg = err.message;
    } else if (typeof err === 'string') {
      errorMsg = err;
    }
    await Report.findByIdAndUpdate(reportId, { status: 'failed', error: errorMsg });
    throw err;
  }
});
