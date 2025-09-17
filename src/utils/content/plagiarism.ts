import { compareTwoStrings } from 'string-similarity';

export function performPlagiarismCheck(text: string, existingContent: string[] = []) {
    if (!text || text.trim().length === 0) {
        return {
            duplicateContentPercentage: 0,
            suspiciousBlocks: [],
            uniquenessScore: 100,
            riskLevel: 'low' as const
        };
    }

    const suspiciousBlocks: Array<{
        text: string;
        startIndex: number;
        endIndex: number;
        similarity: number;
        potentialSource?: string;
    }> = [];

    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 10);
    let totalSimilarity = 0;
    let checkedSentences = 0;

    const sentenceMap: Record<string, number> = {};

    sentences.forEach((sentence, index) => {
        const normalizedSentence = sentence.trim().toLowerCase();
        if (normalizedSentence.length < 10) return;

        if (sentenceMap[normalizedSentence]) {
            suspiciousBlocks.push({
                text: sentence.trim(),
                startIndex: text.indexOf(sentence.trim()),
                endIndex: text.indexOf(sentence.trim()) + sentence.trim().length,
                similarity: 100,
                potentialSource: 'duplicate-within-content'
            });
            totalSimilarity += 100;
        } else {
            sentenceMap[normalizedSentence] = index;
        }

        existingContent.forEach((existing, existingIndex) => {
            if (existing && existing.length > 20) {
                const similarity = compareTwoStrings(normalizedSentence, existing.toLowerCase()) * 100;
                if (similarity > 70) {
                    suspiciousBlocks.push({
                        text: sentence.trim(),
                        startIndex: text.indexOf(sentence.trim()),
                        endIndex: text.indexOf(sentence.trim()) + sentence.trim().length,
                        similarity: Math.round(similarity),
                        potentialSource: `external-source-${existingIndex + 1}`
                    });
                    totalSimilarity += similarity;
                }
            }
        });

        checkedSentences++;
    });

    const commonPatterns = [
        /lorem ipsum dolor sit amet/i,
        /consectetur adipiscing elit/i,
        /sed do eiusmod tempor incididunt/i,
        /ut labore et dolore magna aliqua/i,
        /sample text here/i,
        /placeholder content/i,
        /this is a test/i,
        /dummy text/i
    ];

    commonPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(match => {
                const startIndex = text.indexOf(match);
                suspiciousBlocks.push({
                    text: match,
                    startIndex,
                    endIndex: startIndex + match.length,
                    similarity: 100,
                    potentialSource: 'common-placeholder'
                });
                totalSimilarity += 100;
                checkedSentences++;
            });
        }
    });

    const duplicateContentPercentage = checkedSentences > 0 ? Math.min(100, (totalSimilarity / checkedSentences)) : 0;
    const uniquenessScore = Math.max(0, 100 - duplicateContentPercentage);

    let riskLevel: 'low' | 'medium' | 'high';
    if (duplicateContentPercentage < 10) riskLevel = 'low';
    else if (duplicateContentPercentage < 30) riskLevel = 'medium';
    else riskLevel = 'high';

    return {
        duplicateContentPercentage: Math.round(duplicateContentPercentage),
        suspiciousBlocks: suspiciousBlocks.slice(0, 20),
        uniquenessScore: Math.round(uniquenessScore),
        riskLevel
    };
}
