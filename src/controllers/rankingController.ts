import axios from "axios";
import * as cheerio from "cheerio";
import { Request, Response } from "express";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function extractUrl(href: string): string | null {
  if (!href) return null;

  // Handle Google redirect links
  if (href.startsWith("/url?q=")) {
    try {
      const match = href.match(/\/url\?q=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {
      return null;
    }
  }

  // Direct links
  return href.startsWith("http") ? href : null;
}

async function getGoogleRanking(keyword: string, domain: string): Promise<number> {
  try {
    const query = encodeURIComponent(keyword);
    const url = `https://www.google.com/search?q=${query}&num=100&hl=en`;

    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const { data } = await axios.get(url, {
      headers: { "User-Agent": randomUA, "Accept-Language": "en-US,en;q=0.9" },
    });

    const $ = cheerio.load(data);
    const links: string[] = [];

    console.log("🔍 Parsing search results...");

    // Universal selector for all links in results
    $("#search a").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const link = extractUrl(href);
        if (link) {
          links.push(link);
        }
      }
    });

    // If still no links, fallback regex scan
    if (links.length === 0) {
      const regex = /\/url\?q=([^&]+)&/g;
      let match;
      while ((match = regex.exec(data)) !== null) {
        links.push(decodeURIComponent(match[1]));
      }
    }

    // Normalize target domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase();

    console.log(`🔎 Looking for domain: ${cleanDomain}`);
    console.log("🔗 Retrieved links:", links.slice(0, 10)); // show first 10

    let position = -1;
    for (let i = 0; i < links.length; i++) {
      try {
        const urlObj = new URL(links[i]);
        const resultDomain = urlObj.hostname.replace(/^www\./, "").toLowerCase();

        // Flexible check (subdomains + partial match like google vs google.com.pk)
        if (
          resultDomain === cleanDomain ||
          resultDomain.endsWith(`.${cleanDomain}`) ||
          resultDomain.includes(cleanDomain.split(".")[0])
        ) {
          position = i + 1;
          break;
        }
      } catch {
        continue;
      }
    }

    return position;
  } catch (err) {
    console.error("❌ Error fetching ranking:", err);
    return -1;
  }
}

export const RankingController = {
  async getRanking(req: Request, res: Response) {
    try {
      const { keyword, domain } = req.body;

      if (!keyword || !domain) {
        return res.status(400).json({ error: "Keyword and domain required" });
      }

      const position = await getGoogleRanking(keyword, domain);

      return res.json({
        keyword,
        domain,
        position: position === -1 ? "Not in top 100" : position,
        status: position === -1 ? "not_found" : "found",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("❌ Controller Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
