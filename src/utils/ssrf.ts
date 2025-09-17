import dns from 'dns/promises';

export const ssrfCheck = {
  isValidHttpUrl(url: string): boolean {
    try {
      const u = new URL(url);
      return ['http:', 'https:'].includes(u.protocol);
    } catch {
      return false;
    }
  },
  async isSafeHost(url: string): Promise<boolean> {
    try {
      const u = new URL(url);
      const addresses = await dns.resolve4(u.hostname);
      // Block private IP ranges
      return addresses.every(ip => !/^10\.|^127\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip));
    } catch {
      return false;
    }
  }
};

export type SsrfCheck = typeof ssrfCheck;
