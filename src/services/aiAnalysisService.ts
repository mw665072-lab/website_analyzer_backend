import { analyzeUrl } from '../utils/analyzeUrl';
import { setTimeout as wait } from 'timers/promises';
import crypto from 'crypto';

// runtime-safe fetch: use global fetch if present (Node 18+), otherwise dynamically import node-fetch when needed
async function resolveFetch() {
  // @ts-ignore - globalThis may have fetch
  if (typeof (globalThis as any).fetch === 'function') return (globalThis as any).fetch.bind(globalThis);
  try {
    // Use runtime require via eval to avoid static type checking for node-fetch.
    // This keeps the code usable in Node 18+ (native fetch) and older Node with node-fetch installed.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const req = eval('require');
    const mod = req('node-fetch');
    return (mod.default || mod) as any;
  } catch (e) {
    throw new Error('No fetch available in runtime. Please run in Node 18+ or install node-fetch.');
  }
}

export interface AIAnalysisRequest {
  url: string;
  analysisType?: 'full' | 'seo' | 'performance' | 'accessibility' | 'content';
  priority?: 'high' | 'medium' | 'low';
  includeCompetitorAnalysis?: boolean;
  includeSuggestions?: boolean;
}

export interface AIIssue {
  type: 'seo' | 'performance' | 'accessibility' | 'content' | 'technical' | 'security' | 'mobile' | 'backlink';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  currentValue?: string;
  recommendedValue?: string;
  fix: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeEstimate: string;
    steps: string[];
    codeExample?: string;
    resources?: string[];
  };
  priority: number; // 1-10
  affects: string[]; // e.g., ['rankings', 'user-experience', 'crawlability']
}

export interface AISuggestion {
  category: 'seo' | 'performance' | 'accessibility' | 'content' | 'technical' | 'marketing';
  type: 'improvement' | 'optimization' | 'best-practice' | 'quick-win';
  title: string;
  description: string;
  expectedImpact: 'high' | 'medium' | 'low';
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeRequired: string;
    cost: 'free' | 'low' | 'medium' | 'high';
    steps: string[];
    tools?: string[];
    codeExample?: string;
  };
  metrics: {
    potentialRankingImprovement?: string;
    performanceGain?: string;
    conversionImpact?: string;
    userExperienceScore?: string;
  };
}

export interface AIAnalysisResponse {
  reportId: string;
  url: string;
  analysisTimestamp: string;
  analysisType: string;
  overallScore: {
    total: number; // 0-100
    seo: number;
    performance: number;
    accessibility: number;
    content: number;
    technical: number;
  };
  summary: {
    criticalIssues: number;
    totalIssues: number;
    quickWins: number;
    estimatedFixTime: string;
    priorityLevel: 'urgent' | 'high' | 'medium' | 'low';
  };
  issues: AIIssue[];
  suggestions: AISuggestion[];
  actionPlan: {
    immediate: AIIssue[]; // Fix within 24 hours
    shortTerm: AIIssue[]; // Fix within 1 week
    longTerm: AIIssue[]; // Fix within 1 month
  };
  competitorInsights?: {
    averageScore: number;
    ranking: number;
    strengthsVsCompetitors: string[];
    weaknessesVsCompetitors: string[];
    opportunities: string[];
  };
  trackingMetrics: {
    keyMetricsToMonitor: string[];
    benchmarks: Record<string, number>;
    improvementTargets: Record<string, number>;
  };
}

class AIAnalysisService {
  /**
   * Analyze website using AI to identify issues and provide suggestions
   */
  async analyzeWebsite(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    // Basic input validation
    if (!request || typeof request.url !== 'string' || request.url.trim().length === 0) {
      throw new TypeError('Invalid request: url is required');
    }

    // Normalize request
    const normalizedRequest = { analysisType: 'full', priority: 'medium', includeSuggestions: false, ...request } as AIAnalysisRequest;

    try {
      // Get comprehensive analysis data (this may be expensive)
      const analysisData = await analyzeUrl(normalizedRequest.url);

      // Process the data through AI analysis (may call external AI for suggestions)
      const aiAnalysis = await this.processWithAI(analysisData, normalizedRequest);

      return aiAnalysis;
    } catch (error) {
      // Provide structured error with cause preserved
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`AI Analysis failed: ${msg}`);
    }
  }

  /**
   * Process analysis data through AI to identify issues and generate suggestions
   */
  private async processWithAI(data: any, request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const issues: AIIssue[] = [];
    const suggestions: AISuggestion[] = [];

    // SEO Analysis
    if (request.analysisType === 'full' || request.analysisType === 'seo') {
      issues.push(...this.analyzeSEOIssues(data));
      suggestions.push(...this.generateSEOSuggestions(data));
    }

    // Performance Analysis
    if (request.analysisType === 'full' || request.analysisType === 'performance') {
      issues.push(...this.analyzePerformanceIssues(data));
      suggestions.push(...this.generatePerformanceSuggestions(data));
    }

    // Accessibility Analysis
    if (request.analysisType === 'full' || request.analysisType === 'accessibility') {
      issues.push(...this.analyzeAccessibilityIssues(data));
      suggestions.push(...this.generateAccessibilitySuggestions(data));
    }

    // Content Analysis
    if (request.analysisType === 'full' || request.analysisType === 'content') {
      issues.push(...this.analyzeContentIssues(data));
      suggestions.push(...this.generateContentSuggestions(data));
    }

    // Technical Analysis
    issues.push(...this.analyzeTechnicalIssues(data));
    suggestions.push(...this.generateTechnicalSuggestions(data));

    // Mobile Analysis
    issues.push(...this.analyzeMobileIssues(data));
    suggestions.push(...this.generateMobileSuggestions(data));

    // Security Analysis
    issues.push(...this.analyzeSecurityIssues(data));
    suggestions.push(...this.generateSecuritySuggestions(data));

    // Sort issues by priority
    issues.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.priority - a.priority;
    });

    // Calculate overall scores
    const scores = this.calculateScores(data, issues);
    
    // Generate action plan
    const actionPlan = this.generateActionPlan(issues);
    
    // Generate summary
    const summary = this.generateSummary(issues);

    // Optionally augment suggestions using OpenAI if requested
    let augmentedSuggestions = suggestions;
    if (request.includeSuggestions) {
      try {
        const aiExtra = await this.callOpenAIForSuggestions(data, issues, suggestions, request);
        if (Array.isArray(aiExtra) && aiExtra.length > 0) {
          // Basic validation: ensure objects have a title and description
          const valid = aiExtra.filter((s: any) => s && s.title && s.description);
          augmentedSuggestions = augmentedSuggestions.concat(valid as AISuggestion[]);
        }
      } catch (err) {
        // If augmentation fails, continue with local suggestions
        // (Don't throw to keep backward compatibility)
      }
    }

    return {
      reportId: this.generateReportId(),
      url: data.url || data?.website?.url || request.url,
      analysisTimestamp: new Date().toISOString(),
      analysisType: request.analysisType || 'full',
      overallScore: scores,
      summary,
      issues,
      suggestions: augmentedSuggestions,
      actionPlan,
      trackingMetrics: this.generateTrackingMetrics(data, issues)
    };
  }

  /**
   * Call OpenAI Chat Completions API to get additional suggestions.
   * Returns an array of suggestions (may throw on network errors).
   */
  private async callOpenAIForSuggestions(data: any, issues: AIIssue[], suggestions: AISuggestion[], request: AIAnalysisRequest): Promise<any[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return [];

    // Small helper to perform fetch with timeout and retries
    const maxAttempts = 3;
    const timeoutMs = 10_000;
    let attempt = 0;
    let lastErr: any = null;

    // Build a concise prompt to request JSON suggestions
    const systemPrompt = `You are an expert website auditor. Given analysis data and detected issues, produce a JSON array of suggestion objects matching the application's AISuggestion type. Return ONLY valid JSON array.`;
    const userPrompt = `Analysis summary: ${JSON.stringify({ url: data?.url || request.url, issuesCount: issues.length })}\nTop issues: ${issues.slice(0, 10).map(i => i.title).join('; ')}\nExisting suggestions: ${suggestions.length}\nReturn up to 6 concise suggestions as a JSON array where each item has at least title, description and implementation.steps.`;

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 600
    };

  const fetchFn = await resolveFetch();

  while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetchFn('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        } as any);

        clearTimeout(id);

        if (!res.ok) {
          lastErr = new Error(`OpenAI request failed: ${res.status} ${res.statusText}`);
          // Retry on 5xx
          if (res.status >= 500 && attempt < maxAttempts) {
            await wait(500 * attempt);
            continue;
          }
          break;
        }

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content;
        if (!content) return [];

        // Extract JSON safely: find first '[' and last ']' and parse substring
        const first = content.indexOf('[');
        const last = content.lastIndexOf(']');
        const jsonText = first !== -1 && last !== -1 ? content.substring(first, last + 1) : content;

        try {
          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed)) return parsed;
          return [];
        } catch (parseErr) {
          // Try to salvage with a relaxed parse by replacing single-quotes and trailing commas
          try {
            const relaxed = jsonText.replace(/(['"])??([a-zA-Z0-9_]+?)\1?\s*:/g, '"$2":').replace(/,\s*]/g, ']');
            const parsed2 = JSON.parse(relaxed);
            if (Array.isArray(parsed2)) return parsed2;
          } catch (e) {
            // give up
            return [];
          }
        }
      } catch (err) {
        lastErr = err;
        // exponential backoff
        if (attempt < maxAttempts) await wait(300 * attempt);
      }
    }

    // If we exit loop without returning, log last error for diagnostics and return empty
    if (lastErr) console.warn('OpenAI augmentation failed:', lastErr.message || lastErr);
    return [];
  }

  /**
   * Analyze SEO issues
   */
  private analyzeSEOIssues(data: any): AIIssue[] {
    const issues: AIIssue[] = [];

    // Missing or poor title tag
    if (!data.metadata.title || data.metadata.title.length === 0) {
      issues.push({
        type: 'seo',
        severity: 'critical',
        category: 'Meta Tags',
        title: 'Missing Title Tag',
        description: 'Your page is missing a title tag, which is crucial for search engine rankings and click-through rates.',
        impact: 'Search engines cannot understand what your page is about, leading to poor rankings and reduced visibility.',
        fix: {
          difficulty: 'easy',
          timeEstimate: '5 minutes',
          steps: [
            'Add a <title> tag to your HTML <head> section',
            'Make it descriptive and include your primary keyword',
            'Keep it between 50-60 characters for optimal display',
            'Make each page title unique'
          ],
          codeExample: '<title>Your Page Title - Brand Name</title>',
          resources: ['https://developers.google.com/search/docs/appearance/title-link']
        },
        priority: 10,
        affects: ['rankings', 'click-through-rate', 'user-experience']
      });
    } else if (data.seoAnalysis.titleLength > 60 || data.seoAnalysis.titleLength < 30) {
      issues.push({
        type: 'seo',
        severity: data.seoAnalysis.titleLength > 80 ? 'high' : 'medium',
        category: 'Meta Tags',
        title: 'Title Tag Length Issue',
        description: `Your title tag is ${data.seoAnalysis.titleLength} characters, which is ${data.seoAnalysis.titleLength > 60 ? 'too long' : 'too short'} for optimal SEO.`,
        impact: data.seoAnalysis.titleLength > 60 ? 'Google may truncate your title in search results, reducing click-through rates.' : 'Your title may not be descriptive enough to attract clicks and convey page content.',
        currentValue: `${data.seoAnalysis.titleLength} characters`,
        recommendedValue: '50-60 characters',
        fix: {
          difficulty: 'easy',
          timeEstimate: '10 minutes',
          steps: [
            data.seoAnalysis.titleLength > 60 ? 'Shorten your title to under 60 characters' : 'Expand your title to be more descriptive (30-60 characters)',
            'Include your primary keyword naturally',
            'Make it compelling to encourage clicks',
            'Test the appearance in search results'
          ],
          resources: ['https://moz.com/learn/seo/title-tag']
        },
        priority: 8,
        affects: ['click-through-rate', 'rankings', 'user-experience']
      });
    }

    // Missing or poor meta description
    if (!data.seoAnalysis.hasMetaDescription) {
      issues.push({
        type: 'seo',
        severity: 'high',
        category: 'Meta Tags',
        title: 'Missing Meta Description',
        description: 'Your page lacks a meta description, which is displayed in search results and affects click-through rates.',
        impact: 'Search engines will generate a description from your page content, which may not be compelling or accurate.',
        fix: {
          difficulty: 'easy',
          timeEstimate: '10 minutes',
          steps: [
            'Add a <meta name="description" content="..."> tag to your <head>',
            'Write a compelling description that includes your primary keyword',
            'Keep it between 150-160 characters',
            'Make it unique and accurately describe the page content'
          ],
          codeExample: '<meta name="description" content="Learn how to improve your website\'s SEO with our comprehensive guide. Get actionable tips and strategies to boost your search rankings.">',
          resources: ['https://developers.google.com/search/docs/appearance/snippet']
        },
        priority: 9,
        affects: ['click-through-rate', 'user-experience']
      });
    }

    // H1 tag issues
    if (!data.seoAnalysis.hasH1) {
      issues.push({
        type: 'seo',
        severity: 'high',
        category: 'Content Structure',
        title: 'Missing H1 Tag',
        description: 'Your page is missing an H1 tag, which is important for SEO and content hierarchy.',
        impact: 'Search engines use H1 tags to understand your page\'s main topic, and users rely on them for content structure.',
        fix: {
          difficulty: 'easy',
          timeEstimate: '5 minutes',
          steps: [
            'Add an H1 tag to your page content',
            'Make it descriptive of your main topic',
            'Include your primary keyword naturally',
            'Use only one H1 per page'
          ],
          codeExample: '<h1>Your Main Page Topic Here</h1>',
          resources: ['https://yoast.com/headings-use/']
        },
        priority: 8,
        affects: ['rankings', 'content-structure', 'accessibility']
      });
    } else if (data.seoAnalysis.h1Count > 1) {
      issues.push({
        type: 'seo',
        severity: 'medium',
        category: 'Content Structure',
        title: 'Multiple H1 Tags',
        description: `Your page has ${data.seoAnalysis.h1Count} H1 tags. Best practice is to use only one H1 per page.`,
        impact: 'Multiple H1 tags can confuse search engines about your page\'s main topic.',
        currentValue: `${data.seoAnalysis.h1Count} H1 tags`,
        recommendedValue: '1 H1 tag',
        fix: {
          difficulty: 'medium',
          timeEstimate: '20 minutes',
          steps: [
            'Identify all H1 tags on your page',
            'Choose the most important one as your main H1',
            'Convert other H1s to H2 or H3 tags as appropriate',
            'Ensure proper heading hierarchy (H1 > H2 > H3)'
          ],
          resources: ['https://www.searchenginejournal.com/h1-tag-seo/']
        },
        priority: 6,
        affects: ['content-structure', 'rankings']
      });
    }

    // Image ALT text issues
    if (data.seoAnalysis.imagesWithoutAlt > 0) {
      issues.push({
        type: 'seo',
        severity: data.seoAnalysis.imagesWithoutAlt > 5 ? 'high' : 'medium',
        category: 'Images',
        title: 'Images Missing ALT Text',
        description: `${data.seoAnalysis.imagesWithoutAlt} images on your page are missing ALT text.`,
        impact: 'Images without ALT text hurt accessibility and SEO, as search engines cannot understand image content.',
        currentValue: `${data.seoAnalysis.imagesWithoutAlt} images without ALT`,
        recommendedValue: 'All images should have descriptive ALT text',
        fix: {
          difficulty: 'medium',
          timeEstimate: `${Math.ceil(data.seoAnalysis.imagesWithoutAlt * 2)} minutes`,
          steps: [
            'Identify all images without ALT text',
            'Add descriptive ALT text to each image',
            'Include keywords naturally where relevant',
            'For decorative images, use empty ALT text (alt="")'
          ],
          codeExample: '<img src="image.jpg" alt="Descriptive text about the image content">',
          resources: ['https://www.w3.org/WAI/tutorials/images/']
        },
        priority: 7,
        affects: ['accessibility', 'seo', 'user-experience']
      });
    }

    // Broken links
    if (data.seoAnalysis.brokenLinksCount > 0) {
      issues.push({
        type: 'seo',
        severity: data.seoAnalysis.brokenLinksCount > 10 ? 'high' : 'medium',
        category: 'Links',
        title: 'Broken Links Found',
        description: `${data.seoAnalysis.brokenLinksCount} broken links were found on your page.`,
        impact: 'Broken links create poor user experience and can negatively impact your SEO rankings.',
        currentValue: `${data.seoAnalysis.brokenLinksCount} broken links`,
        recommendedValue: '0 broken links',
        fix: {
          difficulty: 'medium',
          timeEstimate: `${Math.ceil(data.seoAnalysis.brokenLinksCount * 3)} minutes`,
          steps: [
            'Use tools to identify all broken links',
            'Fix URLs that have typos or incorrect paths',
            'Remove links to permanently deleted pages',
            'Replace broken external links with working alternatives',
            'Set up 301 redirects for moved content'
          ],
          resources: ['https://ahrefs.com/blog/broken-links/']
        },
        priority: 7,
        affects: ['user-experience', 'seo', 'crawlability']
      });
    }

    return issues;
  }

  /**
   * Analyze performance issues
   */
  private analyzePerformanceIssues(data: any): AIIssue[] {
    const issues: AIIssue[] = [];
    const lighthouse = data.performance?.lighthouse;

    if (lighthouse?.performanceScore && lighthouse.performanceScore < 50) {
      issues.push({
        type: 'performance',
        severity: lighthouse.performanceScore < 30 ? 'critical' : 'high',
        category: 'Page Speed',
        title: 'Poor Page Performance Score',
        description: `Your page has a low Lighthouse performance score of ${lighthouse.performanceScore}/100.`,
        impact: 'Slow page speeds lead to higher bounce rates, poor user experience, and lower search rankings.',
        currentValue: `${lighthouse.performanceScore}/100`,
        recommendedValue: '90+/100',
        fix: {
          difficulty: 'hard',
          timeEstimate: '2-4 hours',
          steps: [
            'Optimize images (use WebP format, proper sizing)',
            'Minimize JavaScript and CSS files',
            'Enable browser caching',
            'Use a Content Delivery Network (CDN)',
            'Optimize server response time',
            'Remove unused code and resources'
          ],
          resources: ['https://web.dev/performance-scoring/', 'https://developers.google.com/speed/pagespeed/insights/']
        },
        priority: lighthouse.performanceScore < 30 ? 10 : 8,
        affects: ['user-experience', 'rankings', 'conversion-rate']
      });
    }

    // Large Contentful Paint (LCP)
    if (data.performance?.pageSpeed?.largestContentfulPaint && data.performance.pageSpeed.largestContentfulPaint > 2.5) {
      issues.push({
        type: 'performance',
        severity: data.performance.pageSpeed.largestContentfulPaint > 4 ? 'critical' : 'high',
        category: 'Core Web Vitals',
        title: 'Slow Largest Contentful Paint (LCP)',
        description: `Your LCP is ${data.performance.pageSpeed.largestContentfulPaint.toFixed(2)}s, which is above the recommended threshold.`,
        impact: 'Slow LCP affects user experience and is a Core Web Vital that impacts search rankings.',
        currentValue: `${data.performance.pageSpeed.largestContentfulPaint.toFixed(2)}s`,
        recommendedValue: '< 2.5s',
        fix: {
          difficulty: 'hard',
          timeEstimate: '3-5 hours',
          steps: [
            'Optimize your largest image or content element',
            'Implement lazy loading for images',
            'Minimize server response time',
            'Use efficient image formats (WebP, AVIF)',
            'Preload critical resources',
            'Optimize CSS delivery'
          ],
          resources: ['https://web.dev/lcp/']
        },
        priority: 9,
        affects: ['user-experience', 'rankings', 'core-web-vitals']
      });
    }

    return issues;
  }

  /**
   * Analyze accessibility issues
   */
  private analyzeAccessibilityIssues(data: any): AIIssue[] {
    const issues: AIIssue[] = [];

    if (data.accessibility?.score && data.accessibility.score < 70) {
      issues.push({
        type: 'accessibility',
        severity: data.accessibility.score < 50 ? 'critical' : 'high',
        category: 'Web Accessibility',
        title: 'Poor Accessibility Score',
        description: `Your page has an accessibility score of ${data.accessibility.score}/100, indicating barriers for users with disabilities.`,
        impact: 'Poor accessibility excludes users with disabilities and may violate legal requirements (ADA, WCAG).',
        currentValue: `${data.accessibility.score}/100`,
        recommendedValue: '95+/100',
        fix: {
          difficulty: 'medium',
          timeEstimate: '2-3 hours',
          steps: [
            'Add ALT text to all images',
            'Ensure proper color contrast ratios',
            'Use semantic HTML elements',
            'Add keyboard navigation support',
            'Include proper ARIA labels and roles',
            'Test with screen readers'
          ],
          resources: ['https://www.w3.org/WAI/WCAG21/quickref/', 'https://webaim.org/']
        },
        priority: 8,
        affects: ['accessibility', 'user-experience', 'legal-compliance']
      });
    }

    // Add specific accessibility issues from the data
    data.accessibility?.issues?.forEach((issue: any) => {
      if (issue.impact === 'critical' || issue.impact === 'serious') {
        issues.push({
          type: 'accessibility',
          severity: issue.impact === 'critical' ? 'critical' : 'high',
          category: 'Web Accessibility',
          title: issue.type,
          description: issue.description,
          impact: issue.help || 'This affects users with disabilities and may violate accessibility guidelines.',
          fix: {
            difficulty: 'medium',
            timeEstimate: '30 minutes',
            steps: [
              'Review the affected elements',
              'Apply the recommended accessibility fixes',
              'Test with accessibility tools',
              'Validate with screen readers'
            ],
            resources: ['https://www.w3.org/WAI/WCAG21/quickref/']
          },
          priority: issue.impact === 'critical' ? 9 : 7,
          affects: ['accessibility', 'user-experience']
        });
      }
    });

    return issues;
  }

  /**
   * Analyze content issues
   */
  private analyzeContentIssues(data: any): AIIssue[] {
    const issues: AIIssue[] = [];

    // Thin content
    if (data.content?.thinContentAnalysis?.isThinContent) {
      issues.push({
        type: 'content',
        severity: 'high',
        category: 'Content Quality',
        title: 'Thin Content Detected',
        description: 'Your page has been identified as having thin content, which provides little value to users.',
        impact: 'Thin content can hurt your search rankings and provide poor user experience.',
        currentValue: `${data.content.wordCount} words`,
        recommendedValue: 'At least 300+ words of quality content',
        fix: {
          difficulty: 'medium',
          timeEstimate: '1-2 hours',
          steps: [
            'Expand existing content with more detailed information',
            'Add relevant sections that provide value to users',
            'Include examples, case studies, or detailed explanations',
            'Ensure content directly addresses user search intent',
            'Add multimedia elements to enhance understanding'
          ],
          resources: ['https://support.google.com/webmasters/answer/66358']
        },
        priority: 8,
        affects: ['rankings', 'user-experience', 'content-quality']
      });
    }

    // Poor readability
    if (data.content?.readabilityScores && data.content.readabilityScores.averageGradeLevel > 12) {
      issues.push({
        type: 'content',
        severity: 'medium',
        category: 'Content Readability',
        title: 'Content Too Complex',
        description: `Your content has a reading level of grade ${data.content.readabilityScores.averageGradeLevel.toFixed(1)}, which may be too complex for many readers.`,
        impact: 'Complex content can reduce engagement and make your content less accessible to a wider audience.',
        currentValue: `Grade level ${data.content.readabilityScores.averageGradeLevel.toFixed(1)}`,
        recommendedValue: 'Grade level 8-10',
        fix: {
          difficulty: 'medium',
          timeEstimate: '1 hour',
          steps: [
            'Use shorter sentences and paragraphs',
            'Replace complex words with simpler alternatives',
            'Add subheadings to break up text',
            'Use bullet points and lists',
            'Write in active voice',
            'Test readability with tools like Hemingway Editor'
          ],
          resources: ['https://hemingwayapp.com/', 'https://readable.com/']
        },
        priority: 5,
        affects: ['user-experience', 'engagement', 'accessibility']
      });
    }

    return issues;
  }

  /**
   * Analyze technical issues
   */
  private analyzeTechnicalIssues(data: any): AIIssue[] {
    const issues: AIIssue[] = [];

    // Missing HTTPS
    if (!data.technical?.securityHeaders?.hasHttps) {
      issues.push({
        type: 'technical',
        severity: 'critical',
        category: 'Security',
        title: 'Website Not Using HTTPS',
        description: 'Your website is not using HTTPS, which is a security and ranking factor.',
        impact: 'Non-HTTPS sites are marked as "Not Secure" in browsers and may rank lower in search results.',
        fix: {
          difficulty: 'medium',
          timeEstimate: '2-4 hours',
          steps: [
            'Obtain an SSL certificate for your domain',
            'Install the certificate on your web server',
            'Update all internal links to use HTTPS',
            'Set up 301 redirects from HTTP to HTTPS',
            'Update your sitemap and submit to search engines'
          ],
          resources: ['https://developers.google.com/web/fundamentals/security/encrypt-in-transit/why-https']
        },
        priority: 10,
        affects: ['security', 'rankings', 'user-trust']
      });
    }

    // Missing viewport meta tag
    if (!data.technical?.mobileOptimization?.hasViewport) {
      issues.push({
        type: 'technical',
        severity: 'high',
        category: 'Mobile',
        title: 'Missing Viewport Meta Tag',
        description: 'Your page is missing a viewport meta tag, which is essential for mobile responsiveness.',
        impact: 'Without a viewport meta tag, your site may not display properly on mobile devices.',
        fix: {
          difficulty: 'easy',
          timeEstimate: '2 minutes',
          steps: [
            'Add viewport meta tag to the <head> section',
            'Set width=device-width and initial-scale=1',
            'Test on various mobile devices'
          ],
          codeExample: '<meta name="viewport" content="width=device-width, initial-scale=1">',
          resources: ['https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag']
        },
        priority: 9,
        affects: ['mobile-experience', 'rankings']
      });
    }

    return issues;
  }

  /**
   * Analyze mobile optimization issues
   */
  private analyzeMobileIssues(data: any): AIIssue[] {
    const issues: AIIssue[] = [];

    if (data.technical?.mobileOptimization?.mobileScore && data.technical.mobileOptimization.mobileScore < 70) {
      issues.push({
        type: 'mobile',
        severity: data.technical.mobileOptimization.mobileScore < 50 ? 'critical' : 'high',
        category: 'Mobile Experience',
        title: 'Poor Mobile Optimization Score',
        description: `Your mobile optimization score is ${data.technical.mobileOptimization.mobileScore}/100.`,
        impact: 'Poor mobile experience affects user engagement and search rankings, especially with Google\'s mobile-first indexing.',
        currentValue: `${data.technical.mobileOptimization.mobileScore}/100`,
        recommendedValue: '85+/100',
        fix: {
          difficulty: 'hard',
          timeEstimate: '4-8 hours',
          steps: [
            'Implement responsive design',
            'Optimize touch targets (minimum 48px)',
            'Improve page loading speed on mobile',
            'Test across different device sizes',
            'Optimize images for mobile viewing',
            'Simplify navigation for mobile users'
          ],
          resources: ['https://developers.google.com/web/fundamentals/design-and-ux/responsive/']
        },
        priority: 9,
        affects: ['mobile-experience', 'rankings', 'user-experience']
      });
    }

    return issues;
  }

  /**
   * Analyze security issues
   */
  private analyzeSecurityIssues(data: any): AIIssue[] {
    const issues: AIIssue[] = [];

    // Missing security headers
    if (!data.technical?.securityHeaders?.hasHSTS) {
      issues.push({
        type: 'security',
        severity: 'medium',
        category: 'Security Headers',
        title: 'Missing HSTS Header',
        description: 'Your website is missing the HTTP Strict Transport Security (HSTS) header.',
        impact: 'Without HSTS, your site is vulnerable to downgrade attacks and cookie hijacking.',
        fix: {
          difficulty: 'medium',
          timeEstimate: '30 minutes',
          steps: [
            'Configure your web server to send HSTS header',
            'Set max-age to at least 31536000 (1 year)',
            'Consider adding includeSubDomains directive',
            'Test the implementation'
          ],
          codeExample: 'Strict-Transport-Security: max-age=31536000; includeSubDomains',
          resources: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security']
        },
        priority: 6,
        affects: ['security', 'user-trust']
      });
    }

    if (!data.technical?.securityHeaders?.hasCSP) {
      issues.push({
        type: 'security',
        severity: 'medium',
        category: 'Security Headers',
        title: 'Missing Content Security Policy',
        description: 'Your website lacks a Content Security Policy (CSP) header.',
        impact: 'Without CSP, your site is more vulnerable to XSS attacks and code injection.',
        fix: {
          difficulty: 'hard',
          timeEstimate: '1-2 hours',
          steps: [
            'Define a Content Security Policy for your site',
            'Start with a restrictive policy and gradually allow necessary resources',
            'Test thoroughly to ensure functionality',
            'Monitor CSP violation reports'
          ],
          resources: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP']
        },
        priority: 7,
        affects: ['security', 'user-protection']
      });
    }

    return issues;
  }

  /**
   * Generate SEO improvement suggestions
   */
  private generateSEOSuggestions(data: any): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    // Schema markup suggestion
    if (!data.metadata.schema || data.metadata.schema.length === 0) {
      suggestions.push({
        category: 'seo',
        type: 'improvement',
        title: 'Add Schema Markup',
        description: 'Implement structured data to help search engines better understand your content and potentially show rich snippets.',
        expectedImpact: 'medium',
        implementation: {
          difficulty: 'medium',
          timeRequired: '1-2 hours',
          cost: 'free',
          steps: [
            'Identify relevant schema types for your content',
            'Add JSON-LD structured data to your pages',
            'Test with Google\'s Rich Results Test tool',
            'Monitor for rich snippets in search results'
          ],
          tools: ['Google Rich Results Test', 'Schema.org', 'JSON-LD Generator'],
          codeExample: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Company",
  "url": "https://yourwebsite.com"
}
</script>`
        },
        metrics: {
          potentialRankingImprovement: '10-20%',
          userExperienceScore: 'Rich snippets increase CTR by 15-35%'
        }
      });
    }

    // Internal linking improvement
    if (data.seoAnalysis.internalLinksCount < 5) {
      suggestions.push({
        category: 'seo',
        type: 'optimization',
        title: 'Improve Internal Linking',
        description: 'Add more internal links to improve site navigation and help search engines discover and understand your content better.',
        expectedImpact: 'high',
        implementation: {
          difficulty: 'easy',
          timeRequired: '30 minutes',
          cost: 'free',
          steps: [
            'Audit current internal linking structure',
            'Identify related content to link to',
            'Add contextual internal links within content',
            'Create topic clusters and pillar pages',
            'Use descriptive anchor text'
          ]
        },
        metrics: {
          potentialRankingImprovement: '5-15%',
          userExperienceScore: 'Reduces bounce rate by 10-20%'
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate performance improvement suggestions
   */
  private generatePerformanceSuggestions(data: any): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    suggestions.push({
      category: 'performance',
      type: 'optimization',
      title: 'Implement Image Optimization',
      description: 'Optimize images by using next-gen formats, proper sizing, and lazy loading to dramatically improve page speed.',
      expectedImpact: 'high',
      implementation: {
        difficulty: 'medium',
        timeRequired: '2-3 hours',
        cost: 'low',
        steps: [
          'Convert images to WebP or AVIF format',
          'Implement responsive images with srcset',
          'Add lazy loading for images below the fold',
          'Compress images while maintaining quality',
          'Use appropriate image dimensions'
        ],
        tools: ['TinyPNG', 'Squoosh', 'ImageOptim', 'WebP converters']
      },
      metrics: {
        performanceGain: '20-40% faster loading',
        userExperienceScore: 'Improved Core Web Vitals'
      }
    });

    return suggestions;
  }

  /**
   * Generate accessibility improvement suggestions
   */
  private generateAccessibilitySuggestions(data: any): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    suggestions.push({
      category: 'accessibility',
      type: 'best-practice',
      title: 'Improve Color Contrast',
      description: 'Ensure all text has sufficient color contrast ratios to meet WCAG guidelines and improve readability for all users.',
      expectedImpact: 'medium',
      implementation: {
        difficulty: 'easy',
        timeRequired: '1 hour',
        cost: 'free',
        steps: [
          'Audit current color combinations',
          'Use contrast checking tools',
          'Adjust colors to meet WCAG AA standards (4.5:1 for normal text)',
          'Test with users who have visual impairments'
        ],
        tools: ['WebAIM Contrast Checker', 'Colour Contrast Analyser']
      },
      metrics: {
        userExperienceScore: 'Better accessibility for 15% of users'
      }
    });

    return suggestions;
  }

  /**
   * Generate content improvement suggestions
   */
  private generateContentSuggestions(data: any): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    if (data.content?.wordCount && data.content.wordCount < 300) {
      suggestions.push({
        category: 'content',
        type: 'improvement',
        title: 'Expand Content Depth',
        description: 'Add more comprehensive, valuable content to better serve user intent and improve search rankings.',
        expectedImpact: 'high',
        implementation: {
          difficulty: 'medium',
          timeRequired: '2-4 hours',
          cost: 'free',
          steps: [
            'Research user search intent for your target keywords',
            'Add detailed sections covering related topics',
            'Include examples, case studies, or tutorials',
            'Add frequently asked questions',
            'Incorporate multimedia elements'
          ]
        },
        metrics: {
          potentialRankingImprovement: '20-40%',
          userExperienceScore: 'Increased time on page and engagement'
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate technical improvement suggestions
   */
  private generateTechnicalSuggestions(data: any): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    if (!data.metadata.robotsTxt?.exists) {
      suggestions.push({
        category: 'technical',
        type: 'best-practice',
        title: 'Create Robots.txt File',
        description: 'Add a robots.txt file to guide search engine crawling and improve your site\'s SEO foundation.',
        expectedImpact: 'medium',
        implementation: {
          difficulty: 'easy',
          timeRequired: '15 minutes',
          cost: 'free',
          steps: [
            'Create a robots.txt file in your root directory',
            'Specify crawling instructions for search engines',
            'Include your sitemap location',
            'Test with Google Search Console'
          ],
          codeExample: `User-agent: *
Allow: /
Sitemap: https://yourwebsite.com/sitemap.xml`
        },
        metrics: {
          potentialRankingImprovement: '5-10%'
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate mobile optimization suggestions
   */
  private generateMobileSuggestions(data: any): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    suggestions.push({
      category: 'technical',
      type: 'optimization',
      title: 'Optimize for Mobile-First Indexing',
      description: 'Ensure your website is fully optimized for mobile devices as Google primarily uses mobile versions for indexing.',
      expectedImpact: 'high',
      implementation: {
        difficulty: 'hard',
        timeRequired: '8-12 hours',
        cost: 'medium',
        steps: [
          'Implement responsive web design',
          'Optimize touch targets for mobile interaction',
          'Improve mobile page speed',
          'Test across various devices and screen sizes',
          'Ensure content parity between mobile and desktop'
        ],
        tools: ['Google Mobile-Friendly Test', 'BrowserStack', 'Chrome DevTools']
      },
      metrics: {
        potentialRankingImprovement: '15-30%',
        userExperienceScore: 'Better mobile user engagement'
      }
    });

    return suggestions;
  }

  /**
   * Generate security improvement suggestions
   */
  private generateSecuritySuggestions(data: any): AISuggestion[] {
    const suggestions: AISuggestion[] = [];

    suggestions.push({
      category: 'technical',
      type: 'best-practice',
      title: 'Implement Security Headers',
      description: 'Add security headers to protect your website and users from various security threats.',
      expectedImpact: 'medium',
      implementation: {
        difficulty: 'medium',
        timeRequired: '1-2 hours',
        cost: 'free',
        steps: [
          'Configure HSTS header for HTTPS enforcement',
          'Add Content Security Policy (CSP)',
          'Implement X-Frame-Options to prevent clickjacking',
          'Add X-Content-Type-Options header',
          'Test security headers implementation'
        ],
        tools: ['SecurityHeaders.com', 'Observatory by Mozilla']
      },
      metrics: {
        userExperienceScore: 'Enhanced security and user trust'
      }
    });

    return suggestions;
  }

  /**
   * Calculate overall scores based on analysis data
   */
  private calculateScores(data: any, issues: AIIssue[]): AIAnalysisResponse['overallScore'] {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    // Base score calculation (penalize for issues)
    let totalScore = 100;
    totalScore -= criticalCount * 20;
    totalScore -= highCount * 10;
    totalScore -= mediumCount * 5;
    totalScore -= lowCount * 2;

    const seoIssues = issues.filter(i => i.type === 'seo');
    const performanceIssues = issues.filter(i => i.type === 'performance');
    const accessibilityIssues = issues.filter(i => i.type === 'accessibility');
    const contentIssues = issues.filter(i => i.type === 'content');
    const technicalIssues = issues.filter(i => i.type === 'technical');

    return {
      total: Math.max(0, Math.min(100, totalScore)),
      seo: Math.max(0, Math.min(100, data.performance?.lighthouse?.seoScore || 100 - seoIssues.length * 10)),
      performance: Math.max(0, Math.min(100, data.performance?.lighthouse?.performanceScore || 100 - performanceIssues.length * 15)),
      accessibility: Math.max(0, Math.min(100, data.accessibility?.score || 100 - accessibilityIssues.length * 12)),
      content: Math.max(0, Math.min(100, 100 - contentIssues.length * 15)),
      technical: Math.max(0, Math.min(100, 100 - technicalIssues.length * 8))
    };
  }

  /**
   * Generate action plan based on issues priority
   */
  private generateActionPlan(issues: AIIssue[]): AIAnalysisResponse['actionPlan'] {
    const immediate: AIIssue[] = [];
    const shortTerm: AIIssue[] = [];
    const longTerm: AIIssue[] = [];

    issues.forEach(issue => {
      if (issue.severity === 'critical' || (issue.severity === 'high' && issue.fix.difficulty === 'easy')) {
        immediate.push(issue);
      } else if (issue.severity === 'high' || (issue.severity === 'medium' && issue.priority >= 7)) {
        shortTerm.push(issue);
      } else {
        longTerm.push(issue);
      }
    });

    return { immediate, shortTerm, longTerm };
  }

  /**
   * Generate summary of analysis
   */
  private generateSummary(issues: AIIssue[]): AIAnalysisResponse['summary'] {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const quickWins = issues.filter(i => i.fix.difficulty === 'easy' && i.severity !== 'low').length;
    
    // Estimate total fix time
    let totalMinutes = 0;
    issues.forEach(issue => {
      const time = issue.fix.timeEstimate;
      const match = time.match(/(\d+)(?:-(\d+))?\s*(minute|hour)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]) || min;
        const unit = match[3];
        const avgTime = (min + max) / 2;
        totalMinutes += unit === 'hour' ? avgTime * 60 : avgTime;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const estimatedFixTime = hours > 0 ? `${hours}h ${Math.round(minutes)}m` : `${Math.round(minutes)}m`;

    let priorityLevel: 'urgent' | 'high' | 'medium' | 'low' = 'low';
    if (criticalCount > 0) priorityLevel = 'urgent';
    else if (issues.filter(i => i.severity === 'high').length > 2) priorityLevel = 'high';
    else if (issues.filter(i => i.severity === 'medium').length > 5) priorityLevel = 'medium';

    return {
      criticalIssues: criticalCount,
      totalIssues: issues.length,
      quickWins,
      estimatedFixTime,
      priorityLevel
    };
  }

  /**
   * Generate tracking metrics
   */
  private generateTrackingMetrics(data: any, issues: AIIssue[]): AIAnalysisResponse['trackingMetrics'] {
    const metrics = [
      'Page Load Speed',
      'Core Web Vitals (LCP, FID, CLS)',
      'Mobile Usability Score',
      'Accessibility Score',
      'SEO Score'
    ];

    if (issues.some(i => i.type === 'seo')) {
      metrics.push('Organic Search Traffic', 'Average Position', 'Click-Through Rate');
    }

    if (issues.some(i => i.type === 'performance')) {
      metrics.push('Bounce Rate', 'Time on Page', 'Conversion Rate');
    }

    return {
      keyMetricsToMonitor: metrics,
      benchmarks: {
        'Performance Score': data.performance?.lighthouse?.performanceScore || 0,
        'SEO Score': data.performance?.lighthouse?.seoScore || 0,
        'Accessibility Score': data.accessibility?.score || 0,
        'Page Load Time': data.performance?.pageSpeed?.loadTime || 0
      },
      improvementTargets: {
        'Performance Score': 90,
        'SEO Score': 95,
        'Accessibility Score': 95,
        'Page Load Time': 3
      }
    };
  }

  /**
   * Generate a unique report ID
   */
  private generateReportId(): string {
    try {
      // Prefer strong UUID when available
      if (typeof (crypto as any).randomUUID === 'function') {
        return `ai_analysis_${(crypto as any).randomUUID()}`;
      }
    } catch (e) {
      // ignore and fallback
    }
    return `ai_analysis_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

export const aiAnalysisService = new AIAnalysisService();