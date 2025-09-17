// Utility functions for backlink analysis and test data generation

export type Backlink = {
  source: string; // full URL
  anchorText: string;
  target: string; // target URL on analyzed site
  domainRating?: number; // simulated domain strength metric (0-100)
  isNoFollow?: boolean;
  isSponsored?: boolean;
  discoveredAt?: string; // ISO date
};

export type ReferringDomain = {
  domain: string;
  domainRating: number;
  firstSeen?: string;
  lastSeen?: string;
};

// Helper: generate a random integer in range [min, max]
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a plausible random domain name
export function generateRandomDomain(): string {
  const tlds = ['.com', '.org', '.net', '.io', '.co', '.info'];
  const adjectives = ['fast', 'smart', 'bright', 'soft', 'open', 'prime', 'easy', 'bold'];
  const nouns = ['tech', 'media', 'blog', 'site', 'world', 'hub', 'apps', 'news'];
  const name = `${adjectives[randInt(0, adjectives.length - 1)]}${nouns[randInt(0, nouns.length - 1)]}${randInt(1,999)}`;
  const tld = tlds[randInt(0, tlds.length - 1)];
  return `https://${name}${tld}`;
}

// Generate random anchor text
export function generateRandomAnchorText(): string {
  const anchors = [
    'click here',
    'read more',
    'learn more',
    'best services',
    'our product',
    'buy now',
    'free trial',
    'visit site',
    'contact us',
    'homepage'
  ];
  // introduce branded anchors sometimes
  if (Math.random() < 0.2) {
    return `Brand ${randInt(1, 99)}`;
  }
  return anchors[randInt(0, anchors.length - 1)];
}

// Generate multiple anchor texts for a given domain (variety + repeats)
export function generateAnchorTextsForDomain(domain: string, count = 5): string[] {
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const base = generateRandomAnchorText();
    // sometimes include domain or brand name in anchor
    if (Math.random() < 0.15) {
      const host = domain.replace(/^https?:\/\//, '').split('/')[0];
      results.push(`${base} - ${host}`);
    } else {
      results.push(base);
    }
  }
  return results;
}

// Generate source page URLs for a domain
export function generateSourcePages(domain: string, count = 3): string[] {
  const pages: string[] = [];
  const paths = ['blog', 'post', 'article', 'news', 'resources', 'case-study'];
  for (let i = 0; i < count; i++) {
    const p = paths[randInt(0, paths.length - 1)];
    pages.push(`${domain}/${p}/${randInt(1,9999)}`);
  }
  return pages;
}

// Simulate referring domains list
export function generateSimulatedReferringDomains(count = 10): ReferringDomain[] {
  const domains: ReferringDomain[] = [];
  for (let i = 0; i < count; i++) {
    const d = generateRandomDomain();
    const dr = randInt(0, 100);
    const first = new Date(Date.now() - randInt(0, 3650) * 24 * 3600 * 1000).toISOString();
    const last = new Date(Date.now() - randInt(0, 365) * 24 * 3600 * 1000).toISOString();
    domains.push({ domain: d, domainRating: dr, firstSeen: first, lastSeen: last });
  }
  return domains;
}

// Simulate backlink data for a target site
export function generateSimulatedBacklinkData(target: string, count = 25): Backlink[] {
  const backlinks: Backlink[] = [];
  const domains = generateSimulatedReferringDomains(Math.max(5, Math.floor(count / 3)));
  for (let i = 0; i < count; i++) {
  const domain = domains[randInt(0, domains.length - 1)];
  const pages = generateSourcePages(domain.domain, randInt(1,3));
  const source = pages.length > 0 ? pages[randInt(0, pages.length - 1)] : `${domain.domain}/`;
    const anchor = generateRandomAnchorText();
    const dr = domain.domainRating;
    backlinks.push({
      source,
      anchorText: anchor,
      target,
      domainRating: dr,
      isNoFollow: Math.random() < 0.15,
      isSponsored: Math.random() < 0.05,
      discoveredAt: new Date(Date.now() - randInt(0, 365 * 3) * 24 * 3600 * 1000).toISOString(),
    });
  }
  return backlinks;
}

// Create an empty backlink data structure
export function createEmptyBacklinkData(target: string) {
  return {
    target,
    backlinks: [] as Backlink[],
    referringDomains: [] as ReferringDomain[],
  };
}

// Estimate domain age from domain string (simulated)
export function estimateDomainAge(domain: string): number {
  // simulate by hashing domain and mapping to 0-25 years
  let h = 0;
  for (let i = 0; i < domain.length; i++) {
    h = (h << 5) - h + domain.charCodeAt(i);
    h |= 0;
  }
  const years = Math.abs(h) % 25 + 1;
  return years;
}

// Extract brand name heuristically from a URL or title-like input
export function extractBrandName(input: string): string {
  try {
    const host = input.replace(/^https?:\/\//, '').split('/')[0];
    const parts = host.split('.').filter(Boolean);
    if (parts.length === 0) return input;
    // prefer second-level domain
    const sld = parts.length > 2 ? parts[parts.length - 2] : parts[0];
    return sld.replace(/[^a-zA-Z0-9]/g, '');
  } catch (e) {
    return input;
  }
}

// Analyze alt text for images: return score and flagged issues
export function analyzeAltText(alt: string | null): { score: number; issues: string[] } {
  const issues: string[] = [];
  if (!alt || alt.trim().length === 0) {
    issues.push('missing');
  } else {
    const len = alt.trim().length;
    if (len < 3) issues.push('too-short');
    if (len > 125) issues.push('too-long');
    // repetitive keyword stuffing heuristic
    const words = alt.toLowerCase().split(/\s+/);
    const freq: Record<string, number> = {};
    words.forEach(w => (freq[w] = (freq[w] || 0) + 1));
    const max = Math.max(...Object.values(freq));
    if (max / words.length > 0.5) issues.push('keyword-stuffing');
  }
  const score = Math.max(0, 100 - issues.length * 40);
  return { score, issues };
}

// Simple spam score estimation based on anchor texts and domain ratings
export function analyzeSpamScore(backlinks: Backlink[]): { score: number; reasons: string[] } {
  let score = 50; // neutral
  const reasons: string[] = [];
  if (backlinks.length === 0) return { score: 0, reasons: ['no-backlinks'] };
  const lowQuality = backlinks.filter(b => (b.domainRating || 0) < 20 || b.isSponsored || b.isNoFollow);
  const highExactMatchAnchors = backlinks.filter(b => /^(click here|buy now|free trial|homepage)$/i.test(b.anchorText));
  score += Math.round((lowQuality.length / backlinks.length) * 50);
  if (highExactMatchAnchors.length / backlinks.length > 0.15) {
    score += 20;
    reasons.push('high-exact-match-anchors');
  }
  if (lowQuality.length / backlinks.length > 0.3) {
    reasons.push('high-low-quality-percentage');
  }
  // cap
  score = Math.min(100, score);
  return { score, reasons };
}

// Identify spam signals in a backlink list
export function identifySpamSignals(backlinks: Backlink[]): string[] {
  const signals: string[] = [];
  const spammyAnchors = backlinks.filter(b => /(buy now|cheap|discount|click here|free trial)/i.test(b.anchorText));
  if (spammyAnchors.length > 0) signals.push('spammy-anchor-texts');
  const manyNoFollow = backlinks.filter(b => b.isNoFollow).length;
  if (manyNoFollow / (backlinks.length || 1) > 0.6) signals.push('mostly-nofollow');
  const lowDr = backlinks.filter(b => (b.domainRating || 0) < 15).length;
  if (lowDr / (backlinks.length || 1) > 0.4) signals.push('many-low-domain-rating');
  return signals;
}

// Perform a simple backlink analysis combining other funcs
export function performBacklinkAnalysis(target: string, domainOrBacklinks: string | Backlink[]) {
  // domainOrBacklinks may be a domain string (e.g. 'example.com') or an array of Backlink
  let backlinks: Backlink[] = [];
  if (typeof domainOrBacklinks === 'string') {
    // generate simulated backlinks for domain
    backlinks = generateSimulatedBacklinkData(target, 50);
  } else {
    backlinks = domainOrBacklinks;
  }

  const spam = analyzeSpamScore(backlinks);
  const signals = identifySpamSignals(backlinks);
  const referringDomains = Array.from(new Set(backlinks.map(b => {
    const s = b.source || '';
    return s.replace(/^https?:\/\//, '').split('/')[0] || 'unknown';
  }))).map(d => ({ domain: d, domainRating: randInt(0,100) }));
  const topPages = generateTopPages(backlinks);
  const linkGrowth = generateLinkGrowthData();
  const competitorComparison = generateCompetitorComparison(target);
  const linkOpportunities = generateLinkOpportunities(target, backlinks);
  const alerts = generateBacklinkAlerts([], backlinks);

  return {
    overview: {
      totalBacklinks: backlinks.length,
      referringDomains: referringDomains.length,
      followLinks: backlinks.filter(b => !b.isNoFollow).length,
      nofollowLinks: backlinks.filter(b => b.isNoFollow).length,
      domainAuthority: Math.round(referringDomains.reduce((s, d) => s + d.domainRating, 0) / (referringDomains.length || 1)),
      pageAuthority: Math.round(Math.random() * 100),
      spamScore: spam.score,
      trustFlow: Math.round(Math.random() * 100),
      citationFlow: Math.round(Math.random() * 100),
      lastUpdated: new Date().toISOString(),
    },
    referringDomains: referringDomains,
    anchorTextAnalysis: {
      totalAnchors: backlinks.length,
      anchorDistribution: backlinks.slice(0, 20).map(b => ({ text: b.anchorText, count: 1, percentage: Math.round((1 / backlinks.length) * 100 * 100) / 100, type: 'unknown', riskLevel: 'low' })),
      riskAnalysis: {
        overOptimizedAnchors: [],
        spammyAnchors: [],
        brandedRatio: 30,
        exactMatchRatio: 5,
        diversityScore: 70,
        recommendations: [] as string[],
      }
    },
    spamAnalysis: {
      overallSpamScore: spam.score,
      riskLevel: spam.score > 70 ? 'very-high' : spam.score > 50 ? 'high' : spam.score > 30 ? 'medium' : 'low',
      spamSignals: signals,
      toxicDomains: [],
      disavowRecommendations: []
    },
    linkGrowth,
    topPages,
    competitorComparison,
    linkOpportunities,
    alerts
  };
}

// Generate link growth time series (monthly) for the past N months
export function generateLinkGrowthData(startingLinks = 5, months = 12) {
  const data: { month: string; links: number }[] = [];
  let current = startingLinks;
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    // random growth or decline
    current += randInt(-2, 10);
    if (current < 0) current = 0;
    data.push({ month: date.toISOString().slice(0,7), links: current });
  }
  return data;
}

// Compare against simulated competitors
export function generateCompetitorComparison(domain: string, competitors = 3) {
  const baseDr = randInt(10, 80);
  const comp = [] as { domain: string; domainRating: number; backlinks: number }[];
  for (let i = 0; i < competitors; i++) {
    comp.push({ domain: generateRandomDomain(), domainRating: Math.max(1, baseDr + randInt(-30, 30)), backlinks: randInt(10, 5000) });
  }
  return {
    domain,
    domainRating: baseDr,
    competitors: comp,
  };
}

// Suggest link opportunities from competitor pages (simulated)
export function generateLinkOpportunities(domain: string, competitorsBacklinks: Backlink[] = []) {
  // find anchors that look like resource mentions
  const opportunities: { source: string; anchor: string; reason: string }[] = [];
  const sample = competitorsBacklinks.slice(0, 10);
  for (const b of sample) {
    if (!/(sponsored|advertis|buy|cheap)/i.test(b.anchorText)) {
      opportunities.push({ source: b.source, anchor: b.anchorText, reason: 'relevant-anchor' });
    }
  }
  // add a few automated suggestions
  for (let i = 0; i < 3; i++) {
    opportunities.push({ source: generateRandomDomain(), anchor: `Related resource ${i+1}`, reason: 'topically-relevant' });
  }
  return opportunities;
}

// Generate top pages by counting backlinks per target path
export function generateTopPages(backlinks: Backlink[], topN = 5) {
  const counts: Record<string, number> = {};
  for (const b of backlinks) {
    const t = b.target;
    counts[t] = (counts[t] || 0) + 1;
  }
  return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, topN).map(([url, c]) => ({ url, backlinks: c }));
}

// Generate backlink alerts for suspicious changes
export function generateBacklinkAlerts(prev: Backlink[], current: Backlink[]) {
  const prevSet = new Set(prev.map(p => p.source + '|' + p.anchorText));
  const added = current.filter(c => !prevSet.has(c.source + '|' + c.anchorText));
  const alerts: { type: string; backlink: Backlink }[] = [];
  for (const a of added) {
    if ((a.domainRating || 0) < 10) alerts.push({ type: 'low-dr-added', backlink: a });
    if (/(buy now|click here|free trial)/i.test(a.anchorText)) alerts.push({ type: 'spammy-anchor-added', backlink: a });
  }
  return alerts;
}

export default {
  generateRandomDomain,
  generateRandomAnchorText,
  generateAnchorTextsForDomain,
  generateSourcePages,
  generateSimulatedReferringDomains,
  generateSimulatedBacklinkData,
  createEmptyBacklinkData,
  estimateDomainAge,
  extractBrandName,
  analyzeAltText,
  analyzeSpamScore,
  identifySpamSignals,
  performBacklinkAnalysis,
  generateLinkGrowthData,
  generateCompetitorComparison,
  generateLinkOpportunities,
  generateTopPages,
  generateBacklinkAlerts,
};
