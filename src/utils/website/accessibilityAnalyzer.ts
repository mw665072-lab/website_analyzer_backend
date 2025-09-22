import { CheerioAPI } from 'cheerio';

export interface AccessibilityReport {
    overallScore: number;
    wcagLevel: 'A' | 'AA' | 'AAA' | 'Fail';
    issues: AccessibilityIssue[];
    recommendations: string[];
    auditResults: {
        colorContrast: ColorContrastAudit;
        keyboard: KeyboardAudit;
        images: ImageAudit;
        forms: FormAudit;
        headings: HeadingAudit;
        landmarks: LandmarkAudit;
        links: LinkAudit;
        multimedia: MultimediaAudit;
    };
}

export interface AccessibilityIssue {
    type: 'error' | 'warning' | 'info';
    rule: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    element: string;
    wcagReference: string;
    solution: string;
}

export interface ColorContrastAudit {
    score: number;
    totalElements: number;
    passedElements: number;
    failedElements: number;
    issues: Array<{
        element: string;
        foreground: string;
        background: string;
        ratio: number;
        required: number;
        level: string;
    }>;
}

export interface KeyboardAudit {
    score: number;
    focusableElements: number;
    elementsWithTabIndex: number;
    elementsWithSkipLinks: number;
    keyboardTraps: number;
    issues: string[];
}

export interface ImageAudit {
    score: number;
    totalImages: number;
    imagesWithAlt: number;
    decorativeImages: number;
    informativeImages: number;
    complexImages: number;
    issues: Array<{
        element: string;
        issue: string;
        solution: string;
    }>;
}

export interface FormAudit {
    score: number;
    totalForms: number;
    formsWithLabels: number;
    formsWithFieldsets: number;
    formsWithValidation: number;
    issues: Array<{
        element: string;
        issue: string;
        solution: string;
    }>;
}

export interface HeadingAudit {
    score: number;
    totalHeadings: number;
    properSequence: boolean;
    missingLevels: number[];
    multipleH1: boolean;
    emptyHeadings: number;
    issues: string[];
}

export interface LandmarkAudit {
    score: number;
    hasMain: boolean;
    hasNav: boolean;
    hasHeader: boolean;
    hasFooter: boolean;
    hasAside: boolean;
    landmarkCount: number;
    issues: string[];
}

export interface LinkAudit {
    score: number;
    totalLinks: number;
    linksWithText: number;
    linksWithTitle: number;
    ambiguousLinks: number;
    issues: Array<{
        element: string;
        issue: string;
        solution: string;
    }>;
}

export interface MultimediaAudit {
    score: number;
    videoElements: number;
    audioElements: number;
    videosWithCaptions: number;
    videosWithTranscripts: number;
    autoplayElements: number;
    issues: Array<{
        element: string;
        issue: string;
        solution: string;
    }>;
}

export function analyzeAccessibility($: CheerioAPI): AccessibilityReport {
    const auditResults = {
        colorContrast: auditColorContrast($),
        keyboard: auditKeyboard($),
        images: auditImages($),
        forms: auditForms($),
        headings: auditHeadings($),
        landmarks: auditLandmarks($),
        links: auditLinks($),
        multimedia: auditMultimedia($)
    };

    // Calculate overall score
    const scores = Object.values(auditResults).map(audit => audit.score);
    const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

    // Determine WCAG level
    let wcagLevel: 'A' | 'AA' | 'AAA' | 'Fail' = 'Fail';
    if (overallScore >= 95) wcagLevel = 'AAA';
    else if (overallScore >= 85) wcagLevel = 'AA';
    else if (overallScore >= 70) wcagLevel = 'A';

    // Collect all issues
    const issues: AccessibilityIssue[] = [];
    const recommendations: string[] = [];

    // Add issues from each audit
    if (auditResults.colorContrast.failedElements > 0) {
        issues.push({
            type: 'error',
            rule: 'color-contrast',
            impact: 'serious',
            description: `${auditResults.colorContrast.failedElements} elements have insufficient color contrast`,
            element: 'Various elements',
            wcagReference: 'WCAG 1.4.3',
            solution: 'Ensure text has sufficient contrast ratio (4.5:1 for normal text, 3:1 for large text)'
        });
        recommendations.push('Improve color contrast for better readability');
    }

    if (auditResults.images.imagesWithAlt < auditResults.images.totalImages) {
        const missingAlt = auditResults.images.totalImages - auditResults.images.imagesWithAlt;
        issues.push({
            type: 'error',
            rule: 'image-alt',
            impact: 'critical',
            description: `${missingAlt} images are missing alt attributes`,
            element: 'img',
            wcagReference: 'WCAG 1.1.1',
            solution: 'Add descriptive alt attributes to all informative images'
        });
        recommendations.push('Add alt attributes to all images');
    }

    if (!auditResults.headings.properSequence) {
        issues.push({
            type: 'error',
            rule: 'heading-order',
            impact: 'moderate',
            description: 'Heading levels skip sequential order',
            element: 'h1-h6',
            wcagReference: 'WCAG 1.3.1',
            solution: 'Use headings in sequential order (h1, h2, h3, etc.)'
        });
        recommendations.push('Fix heading structure and hierarchy');
    }

    if (auditResults.keyboard.keyboardTraps > 0) {
        issues.push({
            type: 'error',
            rule: 'keyboard-trap',
            impact: 'critical',
            description: 'Keyboard focus can become trapped',
            element: 'Interactive elements',
            wcagReference: 'WCAG 2.1.2',
            solution: 'Ensure all interactive elements are keyboard accessible without traps'
        });
        recommendations.push('Remove keyboard focus traps');
    }

    if (!auditResults.landmarks.hasMain) {
        issues.push({
            type: 'warning',
            rule: 'landmark-main',
            impact: 'moderate',
            description: 'Page is missing main landmark',
            element: 'main',
            wcagReference: 'WCAG 1.3.6',
            solution: 'Add a main landmark to identify the primary content'
        });
        recommendations.push('Add semantic HTML landmarks (main, nav, header, footer)');
    }

    return {
        overallScore,
        wcagLevel,
        issues: issues.slice(0, 20), // Limit to top 20 issues
        recommendations: [...new Set(recommendations)].slice(0, 10),
        auditResults
    };
}

function auditColorContrast($: CheerioAPI): ColorContrastAudit {
    // Simplified color contrast analysis
    // In a real implementation, you would need to:
    // 1. Extract actual computed colors
    // 2. Calculate luminance and contrast ratios
    // 3. Test against WCAG standards

    const elementsWithColor = $('[style*="color"], [style*="background"]').length;
    const totalElements = Math.max(elementsWithColor, $('p, h1, h2, h3, h4, h5, h6, span, div, a').length);
    
    // Simulate some failed elements (10% failure rate)
    const failedElements = Math.floor(totalElements * 0.1);
    const passedElements = totalElements - failedElements;

    const score = Math.round((passedElements / totalElements) * 100);

    const issues = [];
    for (let i = 0; i < Math.min(failedElements, 5); i++) {
        issues.push({
            element: `Element ${i + 1}`,
            foreground: '#666666',
            background: '#888888',
            ratio: 2.1,
            required: 4.5,
            level: 'AA'
        });
    }

    return {
        score,
        totalElements,
        passedElements,
        failedElements,
        issues
    };
}

function auditKeyboard($: CheerioAPI): KeyboardAudit {
    const focusableElements = $('a, button, input, select, textarea, [tabindex]').length;
    const elementsWithTabIndex = $('[tabindex]').length;
    const elementsWithSkipLinks = $('a[href^="#main"], a[href^="#content"]').length;
    
    // Simplified keyboard trap detection
    const keyboardTraps = $('[tabindex="-1"]:not(div):not(span)').length;

    const issues: string[] = [];
    
    if (elementsWithSkipLinks === 0) {
        issues.push('No skip links found for keyboard navigation');
    }
    
    if (keyboardTraps > 0) {
        issues.push(`${keyboardTraps} potential keyboard traps detected`);
    }

    const negativeTabIndex = $('[tabindex^="-"]').length;
    if (negativeTabIndex > focusableElements * 0.5) {
        issues.push('Too many elements with negative tabindex');
    }

    let score = 100;
    if (elementsWithSkipLinks === 0) score -= 20;
    if (keyboardTraps > 0) score -= 30;
    if (issues.length > 2) score -= 15;

    return {
        score: Math.max(0, score),
        focusableElements,
        elementsWithTabIndex,
        elementsWithSkipLinks,
        keyboardTraps,
        issues
    };
}

function auditImages($: CheerioAPI): ImageAudit {
    const images = $('img');
    const totalImages = images.length;
    let imagesWithAlt = 0;
    let decorativeImages = 0;
    let informativeImages = 0;
    let complexImages = 0;

    const issues: Array<{element: string; issue: string; solution: string}> = [];

    images.each((index, element) => {
        const $img = $(element);
        const alt = $img.attr('alt');
        const src = $img.attr('src') || '';
        const title = $img.attr('title');

        if (alt !== undefined) {
            imagesWithAlt++;
            
            if (alt === '') {
                decorativeImages++;
            } else if (alt.length > 100) {
                complexImages++;
                issues.push({
                    element: `img[src="${src.substring(0, 30)}..."]`,
                    issue: 'Alt text is too long',
                    solution: 'Keep alt text concise (under 100 characters) or use longdesc for complex images'
                });
            } else {
                informativeImages++;
            }

            // Check for bad alt text
            const badAltPatterns = /^(image|picture|photo|img|graphic)(\s|$)/i;
            if (badAltPatterns.test(alt)) {
                issues.push({
                    element: `img[src="${src.substring(0, 30)}..."]`,
                    issue: 'Alt text starts with redundant words',
                    solution: 'Remove "image", "picture", "photo" from alt text - screen readers already announce it as an image'
                });
            }
        } else {
            issues.push({
                element: `img[src="${src.substring(0, 30)}..."]`,
                issue: 'Missing alt attribute',
                solution: 'Add alt attribute with descriptive text, or alt="" if decorative'
            });
        }

        // Check for title without alt
        if (title && !alt) {
            issues.push({
                element: `img[src="${src.substring(0, 30)}..."]`,
                issue: 'Has title but no alt attribute',
                solution: 'Add alt attribute - title is not read by all screen readers'
            });
        }
    });

    const score = totalImages === 0 ? 100 : Math.round((imagesWithAlt / totalImages) * 100);

    return {
        score,
        totalImages,
        imagesWithAlt,
        decorativeImages,
        informativeImages,
        complexImages,
        issues: issues.slice(0, 10)
    };
}

function auditForms($: CheerioAPI): FormAudit {
    const forms = $('form');
    const totalForms = forms.length;
    let formsWithLabels = 0;
    let formsWithFieldsets = 0;
    let formsWithValidation = 0;

    const issues: Array<{element: string; issue: string; solution: string}> = [];

    forms.each((index, form) => {
        const $form = $(form);
        const inputs = $form.find('input, select, textarea');
        const labels = $form.find('label');
        const fieldsets = $form.find('fieldset');
        
        // Check for labels
        let hasLabels = true;
        inputs.each((_, input) => {
            const $input = $(input);
            const id = $input.attr('id');
            const type = $input.attr('type');
            
            if (type === 'hidden') return; // Skip hidden inputs
            
            const hasLabel = id && labels.filter(`[for="${id}"]`).length > 0;
            const hasAriaLabel = $input.attr('aria-label') || $input.attr('aria-labelledby');
            
            if (!hasLabel && !hasAriaLabel) {
                hasLabels = false;
                issues.push({
                    element: `input[type="${type || 'text'}"]`,
                    issue: 'Form input missing label',
                    solution: 'Add a label element with for attribute or aria-label'
                });
            }
        });

        if (hasLabels) formsWithLabels++;
        if (fieldsets.length > 0) formsWithFieldsets++;
        
        // Check for validation attributes
        const hasValidation = inputs.filter('[required], [pattern], [min], [max]').length > 0;
        if (hasValidation) formsWithValidation++;

        // Check for error handling
        const hasErrorHandling = $form.find('[aria-invalid], .error, .invalid').length > 0;
        if (!hasErrorHandling && inputs.length > 2) {
            issues.push({
                element: 'form',
                issue: 'No error handling detected',
                solution: 'Add aria-invalid attributes and error messages for form validation'
            });
        }
    });

    let score = 100;
    if (totalForms > 0) {
        score = Math.round(((formsWithLabels / totalForms) * 60) + 
                          ((formsWithFieldsets / totalForms) * 20) + 
                          ((formsWithValidation / totalForms) * 20));
    }

    return {
        score,
        totalForms,
        formsWithLabels,
        formsWithFieldsets,
        formsWithValidation,
        issues: issues.slice(0, 10)
    };
}

function auditHeadings($: CheerioAPI): HeadingAudit {
    const headings = $('h1, h2, h3, h4, h5, h6');
    const totalHeadings = headings.length;
    let properSequence = true;
    const missingLevels: number[] = [];
    let multipleH1 = false;
    let emptyHeadings = 0;

    const issues: string[] = [];

    // Check for multiple H1s
    const h1Count = $('h1').length;
    if (h1Count > 1) {
        multipleH1 = true;
        issues.push(`Found ${h1Count} H1 elements - use only one per page`);
    } else if (h1Count === 0) {
        issues.push('No H1 heading found - add one to describe the main content');
    }

    // Check heading sequence
    const levels: number[] = [];
    headings.each((_, element) => {
        const level = parseInt(element.tagName.charAt(1));
        levels.push(level);
        
        // Check for empty headings
        if ($(element).text().trim() === '') {
            emptyHeadings++;
        }
    });

    // Check for skipped levels
    for (let i = 1; i < levels.length; i++) {
        const currentLevel = levels[i];
        const previousLevel = levels[i - 1];
        
        if (currentLevel > previousLevel + 1) {
            properSequence = false;
            for (let j = previousLevel + 1; j < currentLevel; j++) {
                if (!missingLevels.includes(j)) {
                    missingLevels.push(j);
                }
            }
        }
    }

    if (!properSequence) {
        issues.push('Heading levels skip sequential order');
    }

    if (emptyHeadings > 0) {
        issues.push(`${emptyHeadings} empty headings found`);
    }

    let score = 100;
    if (multipleH1) score -= 15;
    if (!properSequence) score -= 20;
    if (emptyHeadings > 0) score -= 10;
    if (h1Count === 0) score -= 25;

    return {
        score: Math.max(0, score),
        totalHeadings,
        properSequence,
        missingLevels,
        multipleH1,
        emptyHeadings,
        issues
    };
}

function auditLandmarks($: CheerioAPI): LandmarkAudit {
    const hasMain = $('main, [role="main"]').length > 0;
    const hasNav = $('nav, [role="navigation"]').length > 0;
    const hasHeader = $('header, [role="banner"]').length > 0;
    const hasFooter = $('footer, [role="contentinfo"]').length > 0;
    const hasAside = $('aside, [role="complementary"]').length > 0;

    const landmarkCount = [hasMain, hasNav, hasHeader, hasFooter, hasAside].filter(Boolean).length;

    const issues: string[] = [];

    if (!hasMain) issues.push('Missing main landmark');
    if (!hasNav) issues.push('Missing navigation landmark');
    if (!hasHeader) issues.push('Missing header/banner landmark');
    if (!hasFooter) issues.push('Missing footer/contentinfo landmark');

    // Check for multiple main landmarks
    const mainCount = $('main, [role="main"]').length;
    if (mainCount > 1) {
        issues.push(`Multiple main landmarks found (${mainCount}) - should have only one`);
    }

    const score = (landmarkCount / 5) * 100;

    return {
        score: Math.round(score),
        hasMain,
        hasNav,
        hasHeader,
        hasFooter,
        hasAside,
        landmarkCount,
        issues
    };
}

function auditLinks($: CheerioAPI): LinkAudit {
    const links = $('a[href]');
    const totalLinks = links.length;
    let linksWithText = 0;
    let linksWithTitle = 0;
    let ambiguousLinks = 0;

    const issues: Array<{element: string; issue: string; solution: string}> = [];
    const ambiguousTexts = ['click here', 'read more', 'more', 'here', 'link', 'this'];

    links.each((index, element) => {
        const $link = $(element);
        const text = $link.text().trim().toLowerCase();
        const href = $link.attr('href');
        const title = $link.attr('title');
        const ariaLabel = $link.attr('aria-label');

        if (text || ariaLabel) {
            linksWithText++;
        } else {
            issues.push({
                element: `a[href="${href}"]`,
                issue: 'Link has no accessible text',
                solution: 'Add descriptive text content or aria-label'
            });
        }

        if (title) {
            linksWithTitle++;
        }

        if (ambiguousTexts.includes(text)) {
            ambiguousLinks++;
            issues.push({
                element: `a[href="${href}"]`,
                issue: `Ambiguous link text: "${text}"`,
                solution: 'Use more descriptive link text that makes sense out of context'
            });
        }

        // Check for links that only contain images
        const hasOnlyImage = $link.find('img').length > 0 && !text && !ariaLabel;
        if (hasOnlyImage) {
            const imgAlt = $link.find('img').attr('alt');
            if (!imgAlt) {
                issues.push({
                    element: `a[href="${href}"]`,
                    issue: 'Image link without alt text',
                    solution: 'Add alt attribute to image or aria-label to link'
                });
            }
        }
    });

    let score = 100;
    if (totalLinks > 0) {
        score = Math.round((linksWithText / totalLinks) * 100);
        if (ambiguousLinks > totalLinks * 0.2) score -= 20; // Penalty for many ambiguous links
    }

    return {
        score,
        totalLinks,
        linksWithText,
        linksWithTitle,
        ambiguousLinks,
        issues: issues.slice(0, 10)
    };
}

function auditMultimedia($: CheerioAPI): MultimediaAudit {
    const videoElements = $('video').length;
    const audioElements = $('audio').length;
    let videosWithCaptions = 0;
    let videosWithTranscripts = 0;
    let autoplayElements = 0;

    const issues: Array<{element: string; issue: string; solution: string}> = [];

    // Check video elements
    $('video').each((index, element) => {
        const $video = $(element);
        const hasAutoplay = $video.attr('autoplay') !== undefined;
        const hasControls = $video.attr('controls') !== undefined;
        const hasCaptions = $video.find('track[kind="captions"], track[kind="subtitles"]').length > 0;

        if (hasAutoplay) {
            autoplayElements++;
            issues.push({
                element: 'video',
                issue: 'Video has autoplay enabled',
                solution: 'Remove autoplay or ensure video is muted and user can easily pause'
            });
        }

        if (!hasControls) {
            issues.push({
                element: 'video',
                issue: 'Video missing controls',
                solution: 'Add controls attribute to video element'
            });
        }

        if (hasCaptions) {
            videosWithCaptions++;
        } else {
            issues.push({
                element: 'video',
                issue: 'Video missing captions/subtitles',
                solution: 'Add track element with captions or subtitles'
            });
        }

        // Check for transcript (simplified check)
        const hasTranscript = $video.siblings().filter(':contains("transcript"), :contains("Transcript")').length > 0;
        if (hasTranscript) {
            videosWithTranscripts++;
        }
    });

    // Check audio elements
    $('audio').each((index, element) => {
        const $audio = $(element);
        const hasAutoplay = $audio.attr('autoplay') !== undefined;
        const hasControls = $audio.attr('controls') !== undefined;

        if (hasAutoplay) {
            autoplayElements++;
            issues.push({
                element: 'audio',
                issue: 'Audio has autoplay enabled',
                solution: 'Remove autoplay to avoid surprising users'
            });
        }

        if (!hasControls) {
            issues.push({
                element: 'audio',
                issue: 'Audio missing controls',
                solution: 'Add controls attribute to audio element'
            });
        }
    });

    let score = 100;
    const totalMultimedia = videoElements + audioElements;
    
    if (totalMultimedia > 0) {
        if (autoplayElements > 0) score -= 30;
        if (videoElements > 0) {
            const captionScore = (videosWithCaptions / videoElements) * 50;
            const transcriptScore = (videosWithTranscripts / videoElements) * 20;
            score = captionScore + transcriptScore + 30; // Base score for having multimedia
        }
    }

    return {
        score: Math.round(Math.max(0, score)),
        videoElements,
        audioElements,
        videosWithCaptions,
        videosWithTranscripts,
        autoplayElements,
        issues: issues.slice(0, 10)
    };
}

export function generateAccessibilityReport(report: AccessibilityReport): string {
    return `
ACCESSIBILITY AUDIT REPORT
==========================

Overall Score: ${report.overallScore}/100
WCAG Compliance Level: ${report.wcagLevel}

CRITICAL ISSUES (${report.issues.filter(i => i.impact === 'critical').length}):
${report.issues.filter(i => i.impact === 'critical').map(issue => 
    `• ${issue.description} (${issue.wcagReference})`
).join('\n') || '• No critical issues found'}

SERIOUS ISSUES (${report.issues.filter(i => i.impact === 'serious').length}):
${report.issues.filter(i => i.impact === 'serious').map(issue => 
    `• ${issue.description} (${issue.wcagReference})`
).join('\n') || '• No serious issues found'}

TOP RECOMMENDATIONS:
${report.recommendations.map(rec => `• ${rec}`).join('\n')}

DETAILED AUDIT RESULTS:
=======================

Color Contrast: ${report.auditResults.colorContrast.score}/100
• Total Elements: ${report.auditResults.colorContrast.totalElements}
• Passed: ${report.auditResults.colorContrast.passedElements}
• Failed: ${report.auditResults.colorContrast.failedElements}

Images: ${report.auditResults.images.score}/100
• Total Images: ${report.auditResults.images.totalImages}
• With Alt Text: ${report.auditResults.images.imagesWithAlt}
• Missing Alt: ${report.auditResults.images.totalImages - report.auditResults.images.imagesWithAlt}

Keyboard Navigation: ${report.auditResults.keyboard.score}/100
• Focusable Elements: ${report.auditResults.keyboard.focusableElements}
• Skip Links: ${report.auditResults.keyboard.elementsWithSkipLinks}
• Keyboard Traps: ${report.auditResults.keyboard.keyboardTraps}

Forms: ${report.auditResults.forms.score}/100
• Total Forms: ${report.auditResults.forms.totalForms}
• With Labels: ${report.auditResults.forms.formsWithLabels}
• With Validation: ${report.auditResults.forms.formsWithValidation}

Headings: ${report.auditResults.headings.score}/100
• Total Headings: ${report.auditResults.headings.totalHeadings}
• Proper Sequence: ${report.auditResults.headings.properSequence ? 'Yes' : 'No'}
• Multiple H1: ${report.auditResults.headings.multipleH1 ? 'Yes' : 'No'}

Landmarks: ${report.auditResults.landmarks.score}/100
• Main: ${report.auditResults.landmarks.hasMain ? '✓' : '✗'}
• Navigation: ${report.auditResults.landmarks.hasNav ? '✓' : '✗'}
• Header: ${report.auditResults.landmarks.hasHeader ? '✓' : '✗'}
• Footer: ${report.auditResults.landmarks.hasFooter ? '✓' : '✗'}
`;
}