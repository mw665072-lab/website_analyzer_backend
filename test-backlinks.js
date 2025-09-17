const { analyzeUrl } = require('./dist/src/utils/analyzeUrl.js');

async function testBacklinkAnalysis() {
  try {
    console.log('Starting backlink analysis test...');
    
    // Test with a sample URL
    const testUrl = 'https://example.com';
    console.log(`Testing backlink analysis for: ${testUrl}`);
    
    const result = await analyzeUrl(testUrl);
    
    console.log('\n=== BACKLINK ANALYSIS RESULTS ===');
    console.log('Domain Authority:', result.backlinks.overview.domainAuthority);
    console.log('Page Authority:', result.backlinks.overview.pageAuthority);
    console.log('Spam Score:', result.backlinks.overview.spamScore);
    console.log('Total Backlinks:', result.backlinks.overview.totalBacklinks.toLocaleString());
    console.log('Referring Domains:', result.backlinks.overview.referringDomains.toLocaleString());
    console.log('Follow Links:', result.backlinks.overview.followLinks.toLocaleString());
    console.log('Nofollow Links:', result.backlinks.overview.nofollowLinks.toLocaleString());
    
    console.log('\n=== ANCHOR TEXT ANALYSIS ===');
    console.log('Total Anchors:', result.backlinks.anchorTextAnalysis.totalAnchors);
    console.log('Branded Ratio:', result.backlinks.anchorTextAnalysis.riskAnalysis.brandedRatio + '%');
    console.log('Exact Match Ratio:', result.backlinks.anchorTextAnalysis.riskAnalysis.exactMatchRatio + '%');
    console.log('Diversity Score:', result.backlinks.anchorTextAnalysis.riskAnalysis.diversityScore);
    
    console.log('\n=== TOP ANCHOR TEXTS ===');
    result.backlinks.anchorTextAnalysis.anchorDistribution.slice(0, 5).forEach(anchor => {
      console.log(`- "${anchor.text}" (${anchor.count} uses, ${anchor.percentage}%, ${anchor.type}, ${anchor.riskLevel} risk)`);
    });
    
    console.log('\n=== SPAM ANALYSIS ===');
    console.log('Overall Spam Score:', result.backlinks.spamAnalysis.overallSpamScore + '%');
    console.log('Risk Level:', result.backlinks.spamAnalysis.riskLevel);
    console.log('Toxic Domains:', result.backlinks.spamAnalysis.toxicDomains.length);
    console.log('Disavow Recommendations:', result.backlinks.spamAnalysis.disavowRecommendations.length);
    
    console.log('\n=== TOP REFERRING DOMAINS ===');
    result.backlinks.referringDomains.slice(0, 5).forEach(domain => {
      console.log(`- ${domain.domain} (DA: ${domain.domainAuthority}, Spam: ${domain.spamScore}%, ${domain.backlinksCount} links)`);
    });
    
    console.log('\n=== LINK GROWTH ===');
    console.log('Growth Trend:', result.backlinks.linkGrowth.trend);
    console.log('New Links (30 days):', result.backlinks.linkGrowth.newLinksLast30Days);
    console.log('Lost Links (30 days):', result.backlinks.linkGrowth.lostLinksLast30Days);
    console.log('Net Growth:', result.backlinks.linkGrowth.netGrowth);
    
    console.log('\n=== ALERTS ===');
    result.backlinks.alerts.forEach(alert => {
      console.log(`- ${alert.type.toUpperCase()} (${alert.severity}): ${alert.message}`);
    });
    
    console.log('\n=== SEO ISSUES RELATED TO BACKLINKS ===');
    const backlinkIssues = result.seoAnalysis.seoIssues.filter(issue => 
      issue.includes('authority') || 
      issue.includes('spam') || 
      issue.includes('backlink') || 
      issue.includes('anchor') ||
      issue.includes('domain')
    );
    backlinkIssues.forEach(issue => {
      console.log(`- ${issue}`);
    });
    
    console.log('\n=== BACKLINK-RELATED RECOMMENDATIONS ===');
    const backlinkRecs = result.seoAnalysis.recommendations.filter(rec => 
      rec.includes('authority') || 
      rec.includes('spam') || 
      rec.includes('backlink') || 
      rec.includes('anchor') ||
      rec.includes('domain') ||
      rec.includes('disavow') ||
      rec.includes('link')
    );
    backlinkRecs.forEach(rec => {
      console.log(`- ${rec}`);
    });
    
    console.log('\n✅ Backlink analysis test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testBacklinkAnalysis();
