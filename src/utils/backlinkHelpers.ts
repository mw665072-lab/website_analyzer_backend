// Utility helpers for backlink analysis and related simulations

/*
This module provides a set of functions requested by the user for backlink
analysis, spam scoring, simulated backlink data generation, and helper utilities.

Design choices & assumptions:
- Keep implementations self-contained and deterministic where possible.
- Provide lightweight, fast heuristics rather than network calls or heavy computation.
- Export everything as named exports for selective importing.
- Use simple TypeScript types that integrate with the rest of the project.
*/

type Backlink = {
  source: string;
  target: string;
  anchorText: string;
  rel?: string; // e.g., "nofollow", "ugc", "sponsored"
  firstSeen?: string; // ISO date
  lastSeen?: string; // ISO date
  domainAuthority?: number; // 0-100
  spamScore?: number; // 0-100
  anchorIntent?: 'brand' | 'navigational' | 'exact-match' | 'partial-match' | 'generic' | 'other';
};

type ReferringDomain = {
  domain: string;
  links: number;
  domainAuthority?: number;
  firstSeen?: string;
  lastSeen?: string;
};

// Helper: generate a pseudo-random number seeded by string (simple, deterministic)
function hashStringToSeed(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h / 2 ** 32;
}

export function analyzeAltText(altText?: string) {
  // Very lightweight heuristics:
  // - missing alt text => poor accessibility
  // - very long with many keywords => possible keyword stuffing
  // - presence of brand name in alt => likely brand mention
  if (!altText || altText.trim().length === 0) return { score: 0, issues: ['missing'] };
  const text = altText.trim();
  const words = text.split(/\s+/);
  const length = words.length;
  const hasPunctuationSpam = /[\-_,]{3,}|\.{3,}/.test(text);
  const keywordDensity = Math.min(1, (words.filter(w => w.length > 6).length / Math.max(1, length)) );
  const score = Math.round(100 * (0.5 * Math.min(1, length / 10) + 0.5 * (1 - Math.min(1, keywordDensity))));
  const issues: string[] = [];
  if (length < 3) issues.push('too-short');
  if (length > 20) issues.push('too-long');
  if (hasPunctuationSpam) issues.push('suspicious-punctuation');
  return { score, issues, length };
}

export function analyzeSpamScore(text: string) {
  // Lightweight spam score based on suspicious tokens, excessive links, and repetition
  const lower = (text || '').toLowerCase();
  const spamKeywords = ['cheap', 'buy now', 'free', 'click here', 'subscribe', 'limited offer', 'earn money', 'work from home'];
  let matches = 0;
  for (const k of spamKeywords) if (lower.includes(k)) matches++;
  const urlCount = (lower.match(/https?:\/\//g) || []).length;
  const exclamationCount = (text.match(/!/g) || []).length;
  const uppercaseRatio = (text.replace(/[^A-Z]/g, '').length) / Math.max(1, text.length);
  const score = Math.min(100, Math.round((matches * 15) + (urlCount * 10) + (Math.min(5, exclamationCount) * 4) + (uppercaseRatio * 30)));
  const reasons: string[] = [];
  if (matches) reasons.push('keyword-matches');
  if (urlCount) reasons.push('many-urls');
  if (exclamationCount > 3) reasons.push('excessive-exclamations');
  if (uppercaseRatio > 0.3) reasons.push('all-caps');
  return { score, reasons };
}

export function identifySpamSignals(backlinks: Backlink[] | string[]) {
  // Accept array of Backlink objects or array of raw anchor texts/stringified sources
  // Return flagged items and a summary count
  const flagged: Array<{ item: Backlink | string; reasons: string[] }> = [];
  const list = backlinks as any[];
  for (const b of list) {
    let reasons: string[] = [];
    if (typeof b === 'string') {
      const res = analyzeSpamScore(b);
      if (res.score > 40) reasons.push('text-spam');
    } else {
      // b is Backlink
      if ((b.spamScore ?? 0) > 40) reasons.push('backlink-spam-score');
      if (b.rel && b.rel.includes('nofollow') === false && (b.anchorText || '').length < 3) reasons.push('short-anchor');
      if (b.domainAuthority != null && b.domainAuthority < 20) reasons.push('low-da');
      const as = analyzeSpamScore(b.anchorText || '');
      if (as.score > 40) reasons.push('anchor-text-spam');
    }
    if (reasons.length) flagged.push({ item: b, reasons });
  }
  return { flagged, total: list.length };
}

export function generateRandomDomain(seed?: string) {
  const adjectives = ['quick', 'blue', 'smart', 'soft', 'prime', 'daily', 'modern', 'green', 'urban', 'bright'];
  const nouns = ['tech', 'store', 'media', 'solutions', 'reviews', 'guide', 'news', 'hub', 'source', 'world'];
  const tlds = ['.com', '.net', '.org', '.co', '.io'];
  const s = seed ?? String(Math.random());
  const h = hashStringToSeed(s);
  const a = adjectives[Math.floor(h * adjectives.length)];
  const n = nouns[Math.floor((h * 9301) % nouns.length)];
  const t = tlds[Math.floor((h * 49297) % tlds.length)];
  return `${a}${n}${Math.floor(h * 9999)}${t}`;
}

export function generateRandomAnchorText(seed?: string) {
  const brands = ['Acme', 'SoftSuite', 'BrightCo', 'MetaCorp', 'OpenHub'];
  const generic = ['click here', 'read more', 'learn more', 'visit', 'our site'];
  const keywords = ['best product', 'buy cheap', 'top 10', 'review', 'guide'];
  const s = seed ?? String(Math.random());
  const h = hashStringToSeed(s);
  const pool = h > 0.6 ? brands : h > 0.3 ? keywords : generic;
  return pool[Math.floor(h * pool.length)] + (Math.random() > 0.8 ? ` ${Math.floor(h * 999)}` : '');
}

export function generateAnchorTextsForDomain(domain: string, count = 5) {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(generateRandomAnchorText(domain + i));
  }
  return result;
}

export function generateSimulatedReferringDomains(domain: string, count = 10) {
  const out: ReferringDomain[] = [];
  for (let i = 0; i < count; i++) {
    const d = generateRandomDomain(domain + i);
    out.push({
      domain: d,
      links: Math.max(1, Math.round(1 + (hashStringToSeed(d) * 20))),
      domainAuthority: Math.round(10 + hashStringToSeed(d) * 70),
      firstSeen: new Date(Date.now() - Math.floor(hashStringToSeed(d) * 1000 * 86400 * 365)).toISOString(),
      lastSeen: new Date().toISOString(),
    });
  }
  return out;
}

export function generateSourcePages(domain: string, count = 5) {
  const pages: string[] = [];
  for (let i = 0; i < count; i++) {
    pages.push(`https://${generateRandomDomain(domain + i)}/p/${Math.floor(Math.random() * 10000)}`);
  }
  return pages;
}

export function generateSimulatedBacklinkData(targetUrl: string, count = 25) {
  const backlinks: Backlink[] = [];
  for (let i = 0; i < count; i++) {
    const source = `https://${generateRandomDomain(targetUrl + i)}/article/${Math.floor(Math.random() * 10000)}`;
    const anchorText = generateRandomAnchorText(targetUrl + i);
    const da = Math.round(5 + hashStringToSeed(source) * 70);
    const spam = Math.round(analyzeSpamScore(anchorText).score * (0.6 + hashStringToSeed(source) * 0.8));
    backlinks.push({
      source,
      target: targetUrl,
      anchorText,
      rel: Math.random() > 0.8 ? 'nofollow' : undefined,
      firstSeen: new Date(Date.now() - Math.floor(hashStringToSeed(source) * 1000 * 86400 * 365)).toISOString(),
      domainAuthority: da,
      spamScore: spam,
      anchorIntent: anchorText.match(/(review|buy|cheap|best)/i) ? 'exact-match' : 'other',
    });
  }
  return backlinks;
}

export function estimateDomainAge(domain: string) {
  // Simulate: hash -> years between 0 and 20
  const years = Math.max(0, Math.round(hashStringToSeed(domain) * 20));
  const created = new Date(Date.now() - years * 365 * 24 * 3600 * 1000);
  return { years, created: created.toISOString() };
}

export function extractBrandName(urlOrTitle: string) {
  // Very simple: try to pull subdomain or first token from domain or title-like string
  try {
    const u = new URL(urlOrTitle);
    const host = u.hostname.replace(/^www\./i, '');
    const parts = host.split('.');
    return parts[0];
  } catch (e) {
    // fallback to title parsing
    const tokens = urlOrTitle.split(/[-|_\s]/).filter(Boolean);
    return tokens[0] || urlOrTitle;
  }
}

export function generateLinkGrowthData(referringDomains: ReferringDomain[], months = 12) {
  const out: { month: string; totalLinks: number; newDomains: number }[] = [];
  let cumulative = 0;
  for (let m = months - 1; m >= 0; m--) {
    const date = new Date();
    date.setMonth(date.getMonth() - m);
    const monthLabel = date.toISOString().slice(0, 7);
    const newDomains = Math.max(0, Math.round((hashStringToSeed(monthLabel) * referringDomains.length) / 4));
    cumulative += newDomains;
    out.push({ month: monthLabel, totalLinks: cumulative, newDomains });
  }
  return out;
}

export function generateCompetitorComparison(targetDomain: string, competitors: string[]) {
  const rows = competitors.map(c => {
    const rd = generateSimulatedReferringDomains(c, 8);
    const totalLinks = rd.reduce((s, r) => s + r.links, 0);
    return { domain: c, referringDomains: rd.length, totalLinks, avgDA: Math.round(rd.reduce((s, r) => s + (r.domainAuthority || 0), 0) / rd.length) };
  });
  const target = generateSimulatedReferringDomains(targetDomain, 8);
  return { target: { domain: targetDomain, referringDomains: target.length, totalLinks: target.reduce((s, r) => s + r.links, 0), avgDA: Math.round(target.reduce((s, r) => s + (r.domainAuthority || 0), 0) / target.length) }, competitors: rows };
}

export function generateLinkOpportunities(targetDomain: string, candidateDomains: string[], limit = 10) {
  // naive: recommend candidate domains with DA > 30 and few existing links
  const candidates = candidateDomains.map(d => ({ domain: d, da: Math.round(10 + hashStringToSeed(d) * 70), existingLinks: Math.round(hashStringToSeed(d) * 10) }));
  return candidates.filter(c => c.da > 30).sort((a, b) => a.existingLinks - b.existingLinks).slice(0, limit);
}

export function generateTopPages(domain: string, count = 10) {
  const pages: { url: string; visits: number }[] = [];
  for (let i = 0; i < count; i++) {
    const url = `https://${domain}/page/${i + 1}`;
    pages.push({ url, visits: Math.round(100 + hashStringToSeed(url) * 10000) });
  }
  return pages.sort((a, b) => b.visits - a.visits);
}

export function generateBacklinkAlerts(backlinks: Backlink[], threshold = 60) {
  const alerts: Array<{ backlink: Backlink; reason: string }> = [];
  for (const b of backlinks) {
    if ((b.spamScore ?? 0) > threshold) alerts.push({ backlink: b, reason: 'high-spam-score' });
    if ((b.domainAuthority ?? 100) < 10) alerts.push({ backlink: b, reason: 'very-low-da' });
    if (b.rel && b.rel.includes('sponsored')) alerts.push({ backlink: b, reason: 'sponsored' });
  }
  return alerts;
}

export function createEmptyBacklinkData(targetUrl: string) {
  return {
    target: targetUrl,
    backlinks: [] as Backlink[],
    referringDomains: [] as ReferringDomain[],
    generatedAt: new Date().toISOString(),
  };
}

export default {
  analyzeAltText,
  analyzeSpamScore,
  identifySpamSignals,
  generateSimulatedBacklinkData,
  generateSimulatedReferringDomains,
  generateRandomDomain,
  generateRandomAnchorText,
  generateAnchorTextsForDomain,
  generateSourcePages,
  estimateDomainAge,
  extractBrandName,
  generateLinkGrowthData,
  generateCompetitorComparison,
  generateLinkOpportunities,
  generateTopPages,
  generateBacklinkAlerts,
  createEmptyBacklinkData,
};
