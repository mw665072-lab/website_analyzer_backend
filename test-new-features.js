const { analyzeUrl } = require('./src/utils/analyzeUrl.ts');

async function testNewFeatures() {
  console.log('Testing new content analysis features...');
  
  try {
    // Test with a sample website
    const result = await analyzeUrl('https://example.com');
    
    console.log('\n=== READABILITY SCORES ===');
    console.log('Flesch-Kincaid Grade Level:', result.content.readabilityScores.fleschKincaid);
    console.log('Flesch Reading Ease:', result.content.readabilityScores.fleschReadingEase);
    console.log('Gunning Fog Index:', result.content.readabilityScores.gunningFog);
    console.log('Average Grade Level:', result.content.readabilityScores.averageGradeLevel);
    console.log('Readability Grade:', result.content.readabilityScores.readabilityGrade);
    
    console.log('\n=== PLAGIARISM CHECK ===');
    console.log('Uniqueness Score:', result.content.plagiarismCheck.uniquenessScore + '%');
    console.log('Duplicate Content Percentage:', result.content.plagiarismCheck.duplicateContentPercentage + '%');
    console.log('Risk Level:', result.content.plagiarismCheck.riskLevel);
    console.log('Suspicious Blocks:', result.content.plagiarismCheck.suspiciousBlocks.length);
    
    console.log('\n=== THIN CONTENT ANALYSIS ===');
    console.log('Is Thin Content:', result.content.thinContentAnalysis.isThinContent);
    console.log('Content Depth Score:', result.content.thinContentAnalysis.contentDepthScore + '/100');
    console.log('Topic Coverage:', result.content.thinContentAnalysis.topicCoverage + '%');
    console.log('Issues:', result.content.thinContentAnalysis.issues.length);
    
    console.log('\n=== SEO CONTENT SUGGESTIONS ===');
    console.log('Title Issues:', result.content.seoContentSuggestions.metaTagSuggestions.title.issues.length);
    console.log('Title Suggestions:', result.content.seoContentSuggestions.metaTagSuggestions.title.suggestions.length);
    console.log('Description Issues:', result.content.seoContentSuggestions.metaTagSuggestions.description.issues.length);
    console.log('Content Length Verdict:', result.content.seoContentSuggestions.contentLengthAnalysis.lengthVerdict);
    console.log('Content Type:', result.content.seoContentSuggestions.contentLengthAnalysis.contentType);
    
    console.log('\n=== OVERALL RESULTS ===');
    console.log('Word Count:', result.content.wordCount);
    console.log('SEO Issues (Total):', result.seoAnalysis.seoIssues.length);
    console.log('SEO Recommendations (Total):', result.seoAnalysis.recommendations.length);
    
    console.log('\nNew features working correctly! ✅');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error.stack);
  }
}

testNewFeatures();
