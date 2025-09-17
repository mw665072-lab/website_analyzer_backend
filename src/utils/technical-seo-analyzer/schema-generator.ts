import axios from "axios";
import * as cheerio from "cheerio";

interface SchemaInfo { type: string; context: string }
interface SchemaCheckResult { hasSchema: boolean; schemas: SchemaInfo[] }

class SchemaGenerator {
  async checkSchema(url: string): Promise<SchemaCheckResult> {
    try {
      const response = await axios.get<string>(url, { timeout: 5000, headers: { "User-Agent": "schema-generator/1.0" } });
      const $ = cheerio.load(response.data);
      const out: SchemaInfo[] = [];
      const nodes = $('script[type="application/ld+json"]');
      nodes.each((_, el) => {
        const txt = $(el).html();
        if (!txt) return;
        let parsed: any;
        try {
          parsed = JSON.parse(txt);
        } catch {
          return;
        }
        const pushOne = (obj: any) => {
          if (!obj) return;
          const t = obj["@type"] || (typeof obj === "string" ? obj : "Unknown");
          const c = obj["@context"] || "Unknown";
          out.push({ type: String(t), context: String(c) });
        };
        if (Array.isArray(parsed)) {
          for (const item of parsed) pushOne(item);
        } else if (parsed && typeof parsed === "object") {
          if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
            for (const item of parsed["@graph"]) pushOne(item);
          } else {
            pushOne(parsed);
          }
        }
      });
      return { hasSchema: out.length > 0, schemas: out };
    } catch {
      return { hasSchema: false, schemas: [] };
    }
  }
}

export { SchemaGenerator, SchemaInfo, SchemaCheckResult };
