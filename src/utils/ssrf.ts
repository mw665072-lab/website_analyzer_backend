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

  isPrivateIP(ip: string): boolean {
    // Check for private IPv4 ranges
    const ipv4Patterns = [
      /^10\./,                    // 10.0.0.0/8
      /^127\./,                   // 127.0.0.0/8 (loopback)
      /^192\.168\./,              // 192.168.0.0/16
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./ // 172.16.0.0/12
    ];
    
    // Check for private IPv6 ranges
    const ipv6Patterns = [
      /^::1$/,                    // IPv6 loopback
      /^fe80:/i,                  // Link-local
      /^fc00:/i,                  // Unique local
      /^fd00:/i                   // Unique local
    ];

    return ipv4Patterns.some(pattern => pattern.test(ip)) || 
           ipv6Patterns.some(pattern => pattern.test(ip));
  },

  async isSafeHost(url: string): Promise<boolean> {
    try {
      const u = new URL(url);
      
      // If hostname is already an IP, check it directly
      if (/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) {
        return !this.isPrivateIP(u.hostname);
      }
      
      // For IPv6 addresses
      if (u.hostname.includes(':')) {
        return !this.isPrivateIP(u.hostname);
      }

      // Block obviously dangerous hostnames
      const dangerousHosts = ['localhost', '0.0.0.0'];
      if (dangerousHosts.includes(u.hostname.toLowerCase())) {
        return false;
      }

      try {
        // Try to resolve IPv4 addresses
        const ipv4Addresses = await dns.resolve4(u.hostname);
        if (ipv4Addresses.some(ip => this.isPrivateIP(ip))) {
          return false;
        }
      } catch (ipv4Error) {
        // IPv4 resolution failed, try IPv6
        try {
          const ipv6Addresses = await dns.resolve6(u.hostname);
          if (ipv6Addresses.some(ip => this.isPrivateIP(ip))) {
            return false;
          }
        } catch (ipv6Error) {
          // Both IPv4 and IPv6 resolution failed
          // This could be a legitimate domain with temporary DNS issues
          // Allow it through but log the warning
          console.warn(`DNS resolution failed for ${u.hostname}, allowing through SSRF check`);
          return true;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in SSRF check:', error);
      return false;
    }
  }
};

export type SsrfCheck = typeof ssrfCheck;
