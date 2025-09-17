// Readability helper functions extracted from analyzeUrl.ts
export function countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    // Remove ending 'es' and 'ed' except when 'ed' is preceded by 'd' or 't'
    word = word.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^dt]ed)$/g, '');

    // Remove ending 'e' except when preceded by 'le'
    word = word.replace(/(?:[^le])e$/g, '');

    // Count vowel groups
    const matches = word.match(/[aeiouy]+/g);
    const syllableCount = matches ? matches.length : 0;

    return Math.max(1, syllableCount);
}

export function calculateReadabilityScores(text: string) {
    if (!text || text.trim().length === 0) {
        return {
            fleschKincaid: 0,
            fleschReadingEase: 0,
            gunningFog: 0,
            colemanLiau: 0,
            automatedReadabilityIndex: 0,
            smog: 0,
            averageGradeLevel: 0,
            readabilityGrade: 'very-difficult' as const
        };
    }

    try {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        const characters = text.replace(/\s/g, '').length;

        const syllables = text.split(/\s+/).reduce((count, word) => {
            const syllableCount = countSyllables(word);
            return count + Math.max(1, syllableCount);
        }, 0);

        const complexWords = text.split(/\s+/).reduce((count, word) => {
            return count + (countSyllables(word) >= 3 ? 1 : 0);
        }, 0);

        if (sentences === 0 || words === 0) {
            throw new Error('Invalid text for readability analysis');
        }

        const avgWordsPerSentence = words / sentences;
        const avgSyllablesPerWord = syllables / words;
        const avgCharactersPerWord = characters / words;
        const complexWordRatio = complexWords / words;

        const fleschReadingEase = Math.max(0, Math.min(100,
            206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
        ));

        const fleschKincaid = Math.max(0,
            (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59
        );

        const gunningFog = Math.max(0,
            0.4 * (avgWordsPerSentence + (100 * complexWordRatio))
        );

        const avgSentencesPer100Words = (sentences / words) * 100;
        const avgCharactersPer100Words = (characters / words) * 100;
        const colemanLiau = Math.max(0,
            (0.0588 * avgCharactersPer100Words) - (0.296 * avgSentencesPer100Words) - 15.8
        );

        const automatedReadabilityIndex = Math.max(0,
            (4.71 * avgCharactersPerWord) + (0.5 * avgWordsPerSentence) - 21.43
        );

        const smog = Math.max(0,
            1.043 * Math.sqrt(complexWords * (30 / sentences)) + 3.1291
        );

        const scores = [fleschKincaid, gunningFog, colemanLiau, automatedReadabilityIndex, smog];
        const averageGradeLevel = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        let readabilityGrade: 'very-easy' | 'easy' | 'fairly-easy' | 'standard' | 'fairly-difficult' | 'difficult' | 'very-difficult';

        if (fleschReadingEase >= 90) readabilityGrade = 'very-easy';
        else if (fleschReadingEase >= 80) readabilityGrade = 'easy';
        else if (fleschReadingEase >= 70) readabilityGrade = 'fairly-easy';
        else if (fleschReadingEase >= 60) readabilityGrade = 'standard';
        else if (fleschReadingEase >= 50) readabilityGrade = 'fairly-difficult';
        else if (fleschReadingEase >= 30) readabilityGrade = 'difficult';
        else readabilityGrade = 'very-difficult';

        return {
            fleschKincaid: Math.round(fleschKincaid * 100) / 100,
            fleschReadingEase: Math.round(fleschReadingEase * 100) / 100,
            gunningFog: Math.round(gunningFog * 100) / 100,
            colemanLiau: Math.round(colemanLiau * 100) / 100,
            automatedReadabilityIndex: Math.round(automatedReadabilityIndex * 100) / 100,
            smog: Math.round(smog * 100) / 100,
            averageGradeLevel: Math.round(averageGradeLevel * 100) / 100,
            readabilityGrade
        };
    } catch (error) {
        console.warn('Readability calculation failed:', error);
        return {
            fleschKincaid: 0,
            fleschReadingEase: 0,
            gunningFog: 0,
            colemanLiau: 0,
            automatedReadabilityIndex: 0,
            smog: 0,
            averageGradeLevel: 0,
            readabilityGrade: 'very-difficult' as const
        };
    }
}
