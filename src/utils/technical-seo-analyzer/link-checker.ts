import axios, { AxiosResponse } from "axios";

interface CrawledPage {
    status: number;
    title?: string;
    description?: string;
    isIndexable?: boolean;
    links: string[];
    error?: boolean;
}

interface BrokenLink {
    url: string;
    status: number | string;
    referer: string;
    error?: string;
}

interface RedirectLink {
    from: string;
    to?: string;
    status: number;
    referer: string;
}

interface BrokenLinkCheckResult {
    broken: BrokenLink[];
    redirects: RedirectLink[];
}

export class BrokenLinkChecker {
    private baseURL: string;
    private concurrency: number;
    private perPageLimit: number;
    private totalLimit: number;

    constructor(baseURL: string, options?: { concurrency?: number; perPageLimit?: number; totalLimit?: number }) {
        this.baseURL = baseURL;
        this.concurrency = options?.concurrency ?? 5;
        this.perPageLimit = options?.perPageLimit ?? 5;
        this.totalLimit = options?.totalLimit ?? 15;
    }

    async checkLinks(crawledPages: Map<string, CrawledPage>): Promise<BrokenLinkCheckResult> {
        const broken: BrokenLink[] = [];
        const redirects: RedirectLink[] = [];
        const checkedUrls = new Set<string>();
        const allLinks: { url: string; referer: string }[] = [];

        for (const [url, data] of crawledPages.entries()) {
            if (data.error) {
                broken.push({ url, status: data.status, referer: "Crawler detected" });
                continue;
            }
            for (const link of data.links.slice(0, this.perPageLimit)) {
                if (!checkedUrls.has(link)) {
                    checkedUrls.add(link);
                    allLinks.push({ url: link, referer: url });
                }
            }
        }

        const linksToCheck = allLinks.slice(0, this.totalLimit);

        for (let i = 0; i < linksToCheck.length; i += this.concurrency) {
            const batch = linksToCheck.slice(i, i + this.concurrency);
            const results = await Promise.all(batch.map(({ url: link, referer }) => this.checkSingleLink(link, referer)));
            for (const res of results) {
                if (!res) continue;
                if (res.type === "broken") broken.push(res.data);
                else if (res.type === "redirect") redirects.push(res.data);
            }
        }

        return { broken, redirects };
    }

    private async checkSingleLink(link: string, referer: string): Promise<{ type: "broken" | "redirect" | "ok"; data?: any } | null> {
        try {
            let response: AxiosResponse = await axios.head(link, {
                maxRedirects: 0,
                validateStatus: () => true,
                timeout: 3000,
            });
            if (response.status === 405 || response.status === 501) {
                response = await axios.get(link, { maxRedirects: 0, validateStatus: () => true, timeout: 3000 });
            }
            if (response.status >= 400) {
                return { type: "broken", data: { url: link, status: response.status, referer } };
            }
            if (response.status >= 300 && response.status < 400) {
                return { type: "redirect", data: { from: link, to: response.headers.location, status: response.status, referer } };
            }
            return { type: "ok" };
        } catch (err: any) {
            return { type: "broken", data: { url: link, status: "Error", error: err?.message, referer } };
        }
    }
}
