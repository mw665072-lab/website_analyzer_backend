interface CrawledPage {
    status: number;
    title: string;
    description?: string;
    isIndexable?: boolean;
    links: string[];
    error?: boolean;
}

interface DepthGroup {
    [depth: number]: { url: string; title: string }[];
}

class SiteArchitectureVisualizer {
    visualize(crawledPages: Map<string, CrawledPage>): DepthGroup {
        const depthMap: Map<string, number> = new Map();
        const visited: Set<string> = new Set();
        const keys = Array.from(crawledPages.keys());
        if (keys.length === 0) return {};
        const queue: string[] = [];
        const homepage = keys[0];
        queue.push(homepage);
        depthMap.set(homepage, 0);
        visited.add(homepage);
        while (queue.length) {
            const url = queue.shift() as string;
            const depth = depthMap.get(url) as number;
            const page = crawledPages.get(url);
            if (!page || !page.links) continue;
            for (const link of page.links) {
                if (!crawledPages.has(link)) continue;
                const existing = depthMap.get(link);
                const newDepth = depth + 1;
                if (existing === undefined || existing > newDepth) {
                    depthMap.set(link, newDepth);
                }
                if (!visited.has(link)) {
                    visited.add(link);
                    queue.push(link);
                }
            }
        }
        const depthGroups: DepthGroup = {};
        depthMap.forEach((depth, url) => {
            if (!depthGroups[depth]) depthGroups[depth] = [];
            depthGroups[depth].push({ url, title: crawledPages.get(url)?.title || "No title" });
        });
        return depthGroups;
    }
}

export { SiteArchitectureVisualizer, CrawledPage, DepthGroup };
