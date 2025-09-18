# Vercel Deployment Guide

This guide explains how to deploy your website analyzer API to Vercel with proper timeout configurations.

## Changes Made to Fix Vercel Timeout Issues

### 1. Updated `vercel.json`
- Added `maxDuration: 300` (5 minutes) for Pro plan
- For Hobby plan, this will be capped at 10 seconds

### 2. Optimized Analysis Functions
- **Screenshot Capture**: 
  - Reduced timeouts for Vercel environment
  - Disabled full-page screenshots (faster)
  - Added single-process flag for Puppeteer
  - Reduced image quality to 80% for speed
  
- **Speed Audit (Lighthouse)**:
  - Added mobile emulation for faster audits  
  - Reduced wait times for Vercel
  - Removed large artifacts from response payload
  - Better error handling and timeout management

- **Main Analysis Function**:
  - Added proper timeout handling for both website and SEO analysis
  - Better error handling and partial results
  - Detailed logging for debugging

### 3. Environment Variables
Set these in your Vercel dashboard:

```bash
ANALYZE_TIMEOUT_MS=280000          # 4.67 minutes (under 5 min limit)
WEBSITE_ANALYSIS_TIMEOUT_MS=240000 # 4 minutes for screenshots + content
SEO_ANALYSIS_TIMEOUT_MS=180000     # 3 minutes for Lighthouse + SEO
```

## Deployment Steps

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**:
   ```bash
   npx vercel --prod
   ```

3. **Set Environment Variables in Vercel Dashboard**:
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add the timeout variables listed above

4. **Verify Deployment**:
   Test with a simple website first:
   ```bash
   curl -X POST https://your-app.vercel.app/analyze \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   ```

## Plan Recommendations

- **Hobby Plan**: Limited to 10-second function execution. Not suitable for this API.
- **Pro Plan**: 5-minute execution limit. Should work with the optimizations.
- **Enterprise Plan**: 15-minute limit. Best for complex analysis.

## Monitoring

The API now includes detailed logging:
- Analysis start/completion times
- Screenshot capture progress  
- Lighthouse audit duration
- Timeout handling

Check Vercel function logs to monitor performance and debug issues.

## Troubleshooting

If you still get null values:
1. Check Vercel function logs for timeout errors
2. Reduce timeout values further if needed
3. Consider upgrading to Pro/Enterprise plan
4. Test with simpler websites first

## Local Development

Use the optimized development script:
```bash
npm run dev:vercel
```

This sets the same timeout values used in production.