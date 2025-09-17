export function generateTitleSuggestions(currentTitle: string, topKeywords: string[]) {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const length = currentTitle?.length || 0;

    if (!currentTitle || currentTitle.trim() === '') {
        issues.push('Missing title tag');
        suggestions.push('Add a descriptive title tag that includes your main keyword');
    } else {
        if (length < 30) {
            issues.push(`Title too short (${length} characters)`);
            suggestions.push('Expand title to 30-60 characters for better optimization');
        } else if (length > 60) {
            issues.push(`Title too long (${length} characters, may be truncated in search results)`);
            suggestions.push('Shorten title to under 60 characters to avoid truncation');
        }

        const titleLower = currentTitle.toLowerCase();
        const hasKeywords = topKeywords.some(keyword => titleLower.includes(keyword.toLowerCase()));

        if (!hasKeywords && topKeywords.length > 0) {
            issues.push('Title does not contain main keywords');
            suggestions.push(`Include primary keyword "${topKeywords[0]}" in the title`);
        }

        if (topKeywords.length > 0) {
            const primaryKeyword = topKeywords[0];
            const secondaryKeyword = topKeywords[1] || '';

            suggestions.push(`${primaryKeyword} - Complete Guide & Best Practices`);
            suggestions.push(`How to ${primaryKeyword}: Expert Tips & Strategies`);
            if (secondaryKeyword) {
                suggestions.push(`${primaryKeyword} and ${secondaryKeyword}: Ultimate Guide`);
            }
            suggestions.push(`${primaryKeyword}: Everything You Need to Know`);
        }
    }

    return {
        current: currentTitle || '',
        suggestions: suggestions.slice(0, 5),
        optimalLength: '30-60 characters',
        issues
    };
}

export function generateDescriptionSuggestions(currentDescription: string, title: string, topKeywords: string[]) {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const length = currentDescription?.length || 0;

    if (!currentDescription || currentDescription.trim() === '') {
        issues.push('Missing meta description');
        suggestions.push('Add a compelling meta description that summarizes your page content');
    } else {
        if (length < 120) {
            issues.push(`Meta description too short (${length} characters)`);
            suggestions.push('Expand meta description to 120-160 characters');
        } else if (length > 160) {
            issues.push(`Meta description too long (${length} characters, may be truncated)`);
            suggestions.push('Shorten meta description to under 160 characters');
        }

        const descLower = currentDescription.toLowerCase();
        const hasKeywords = topKeywords.some(keyword => descLower.includes(keyword.toLowerCase()));

        if (!hasKeywords && topKeywords.length > 0) {
            issues.push('Meta description does not contain main keywords');
            suggestions.push(`Include primary keyword "${topKeywords[0]}" in the description`);
        }

        if (topKeywords.length > 0) {
            const primaryKeyword = topKeywords[0];

            suggestions.push(`Learn everything about ${primaryKeyword} with our comprehensive guide. Expert tips, best practices, and actionable strategies included.`);
            suggestions.push(`Discover the ultimate ${primaryKeyword} guide. Get practical insights and proven methods to achieve your goals effectively.`);
            suggestions.push(`Master ${primaryKeyword} with our step-by-step guide. Includes expert tips, common mistakes to avoid, and proven strategies.`);
        }
    }

    return {
        current: currentDescription || '',
        suggestions: suggestions.slice(0, 3),
        optimalLength: '120-160 characters',
        issues
    };
}

export function generateKeywordsSuggestions(currentKeywords: string, topKeywords: string[]) {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (!currentKeywords || currentKeywords.trim() === '') {
        issues.push('Meta keywords tag is empty (Note: Most search engines ignore this tag)');
        suggestions.push('Consider focusing on content keywords rather than meta keywords tag');
    } else {
        const keywordList = currentKeywords.split(',').map(k => k.trim());
        if (keywordList.length > 10) {
            issues.push('Too many meta keywords (limit to 5-10 most relevant)');
        }
    }

    if (topKeywords.length > 0) {
        suggestions.push(topKeywords.slice(0, 8).join(', '));

        const relatedKeywords = topKeywords.slice(0, 3).map(keyword => [
            `${keyword} guide`,
            `${keyword} tips`,
            `best ${keyword}`,
            `${keyword} tutorial`
        ]).flat();

        suggestions.push(relatedKeywords.slice(0, 8).join(', '));
    }

    return {
        current: currentKeywords || '',
        suggestions: suggestions.slice(0, 2),
        issues
    };
}

export function generateHeadingSuggestions(headings: Array<{ level: number; text: string }>, topKeywords: string[]) {
    const issues: string[] = [];
    const hierarchyIssues: string[] = [];

    const h1s = headings.filter(h => h.level === 1);
    const h2s = headings.filter(h => h.level === 2);

    const missingH1 = h1s.length === 0;
    const multipleH1 = h1s.length > 1;

    if (missingH1) {
        issues.push('Missing H1 tag - add a main heading for your page');
        hierarchyIssues.push('No H1 heading found');
    }

    if (multipleH1) {
        issues.push(`Multiple H1 tags found (${h1s.length}) - use only one H1 per page`);
        hierarchyIssues.push('Multiple H1 headings detected');
    }

    if (h2s.length === 0 && headings.length > 1) {
        issues.push('No H2 tags found - consider adding subheadings for better structure');
        hierarchyIssues.push('Missing H2 subheadings');
    }

    let previousLevel = 0;
    headings.forEach((heading, index) => {
        if (heading.level > previousLevel + 1) {
            hierarchyIssues.push(`Heading hierarchy issue: H${heading.level} follows H${previousLevel} (skip levels detected)`);
        }
        previousLevel = heading.level;
    });

    const headingStructure = headings.map(heading => {
        const suggestions: string[] = [];
        const headingIssues: string[] = [];

        const headingLower = heading.text.toLowerCase();
        const hasKeywords = topKeywords.some(keyword => headingLower.includes(keyword.toLowerCase()));

        if (!hasKeywords && topKeywords.length > 0 && (heading.level === 1 || heading.level === 2)) {
            headingIssues.push('Heading could include relevant keywords');
            if (topKeywords[0]) {
                suggestions.push(`${heading.text} - ${topKeywords[0]} Guide`);
                suggestions.push(`${topKeywords[0]}: ${heading.text}`);
            }
        }

        if (heading.text.length < 10) {
            headingIssues.push('Heading is very short');
            suggestions.push(`Expand heading to be more descriptive`);
        } else if (heading.text.length > 100) {
            headingIssues.push('Heading is too long');
            suggestions.push('Shorten heading for better readability');
        }

        return {
            level: heading.level,
            current: heading.text,
            suggestions: suggestions.slice(0, 2),
            issues: headingIssues
        };
    });

    return {
        missingH1,
        multipleH1,
        headingStructure: headingStructure.slice(0, 10),
        hierarchyIssues
    };
}

export function analyzeContentLength(wordCount: number, title: string, headings: Array<{ level: number; text: string }>) {
    let contentType: 'blog-post' | 'product-page' | 'landing-page' | 'about-page' | 'other' = 'other';
    let recommendedMinLength = 300;
    let recommendedMaxLength = 2000;

    const titleLower = (title || '').toLowerCase();
    if (titleLower.includes('blog') || titleLower.includes('guide') || titleLower.includes('how to') || titleLower.includes('tutorial')) {
        contentType = 'blog-post';
        recommendedMinLength = 500;
        recommendedMaxLength = 3000;
    } else if (titleLower.includes('product') || titleLower.includes('buy') || titleLower.includes('price')) {
        contentType = 'product-page';
        recommendedMinLength = 300;
        recommendedMaxLength = 1500;
    } else if (titleLower.includes('contact') || titleLower.includes('landing') || titleLower.includes('get started')) {
        contentType = 'landing-page';
        recommendedMinLength = 200;
        recommendedMaxLength = 1000;
    } else if (titleLower.includes('about') || titleLower.includes('company') || titleLower.includes('team')) {
        contentType = 'about-page';
        recommendedMinLength = 200;
        recommendedMaxLength = 800;
    }

    let lengthVerdict: 'too-short' | 'optimal' | 'too-long';
    if (wordCount < recommendedMinLength) {
        lengthVerdict = 'too-short';
    } else if (wordCount > recommendedMaxLength) {
        lengthVerdict = 'too-long';
    } else {
        lengthVerdict = 'optimal';
    }

    const suggestions: string[] = [];

    if (lengthVerdict === 'too-short') {
        suggestions.push(`Expand content to at least ${recommendedMinLength} words for better SEO performance`);
        suggestions.push('Add more detailed explanations, examples, and supporting information');
        suggestions.push('Include FAQ section or additional resources');

        if (contentType === 'blog-post') {
            suggestions.push('Add more sections covering different aspects of the topic');
            suggestions.push('Include case studies, statistics, or expert quotes');
        }
    } else if (lengthVerdict === 'too-long') {
        suggestions.push(`Consider shortening content or breaking it into multiple pages (current: ${wordCount} words, recommended max: ${recommendedMaxLength})`);
        suggestions.push('Remove redundant information and focus on key points');
        suggestions.push('Use bullet points and lists to make content more scannable');
    } else {
        suggestions.push('Content length is optimal for this page type');
        suggestions.push('Focus on improving content quality and user engagement');
    }

    return {
        currentLength: wordCount,
        recommendedMinLength,
        recommendedMaxLength,
        contentType,
        lengthVerdict,
        suggestions: suggestions.slice(0, 3)
    };
}
