import axios from "axios";
import * as cheerio from "cheerio";

interface MobileScanResult {
    isMobileFriendly: boolean;
    viewport: boolean;
    touchIcons: boolean;
    appropriateFontSize: boolean;
}

class MobileScanner {
    async scan(url: string): Promise<MobileScanResult | null> {
        try {
            const response = await axios.get<string>(url, {
                timeout: 12000, // Increased from 8000 to 12000ms
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; AnalyzerBot/1.0)",
                    "Accept": "text/html,application/xhtml+xml"
                },
                responseType: "text",
                maxRedirects: 3, // Limit redirects
            });
            const $ = cheerio.load(response.data || "");
            const viewport = ($('meta[name="viewport"]').attr("content") || "").toLowerCase();
            const isViewportPresent = viewport.includes("width=device-width") || viewport.includes("initial-scale");
            const touchIcons = $('link[rel~="icon"],link[rel="apple-touch-icon"]').toArray().some((el) => {
                const attrib = $(el).attr("sizes") || $(el).attr("rel") || "";
                return Boolean(attrib) || /apple-touch-icon/i.test($(el).attr("rel") || "");
            });
            const bodyStyle = $("body").attr("style") || "";
            const match = bodyStyle.match(/font-size:\s*(\d+(?:\.\d+)?)px/i);
            const isFontSizeAppropriate = !match || parseFloat(match[1]) >= 12;
            return {
                isMobileFriendly: isViewportPresent && touchIcons && isFontSizeAppropriate,
                viewport: isViewportPresent,
                touchIcons,
                appropriateFontSize: isFontSizeAppropriate,
            };
        } catch (_) {
            return null;
        }
    }
}

export { MobileScanner, MobileScanResult };
