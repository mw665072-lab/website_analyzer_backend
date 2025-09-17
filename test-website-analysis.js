const { analyzeWebsite } = require('./dist/src/utils/website/websiteanalyzeutils.js');

async function testWebsiteAnalysis() {
    console.log('Testing website analysis with the improved code...');
    
    try {
        const result = await analyzeWebsite('https://www.solsmint.com/');
        console.log('\n=== ANALYSIS RESULTS ===\n');
        console.log('URL:', result.url);
        console.log('Performance:', JSON.stringify(result.performance, null, 2));
        console.log('Fonts:', JSON.stringify(result.fonts, null, 2));
        console.log('Colors:', JSON.stringify(result.colors, null, 2));
        console.log('Spacing:', JSON.stringify(result.spacing, null, 2));
        console.log('Dimensions:', JSON.stringify(result.dimensions, null, 2));
        console.log('Media Queries:', JSON.stringify(result.mediaQueries, null, 2));
        console.log('CSS Stats:', JSON.stringify(result.cssStats, null, 2));
        console.log('External Stylesheets:', JSON.stringify(result.externalStylesheets, null, 2));
        
        // Verify we got meaningful data
        const hasData = 
            result.fonts.families.length > 0 || 
            result.colors.text.length > 0 || 
            result.colors.background.length > 0 ||
            result.spacing.margins.length > 0 ||
            result.dimensions.widths.length > 0 ||
            result.mediaQueries.length > 0;
            
        console.log('\n=== TEST RESULT ===');
        console.log('Has meaningful data:', hasData ? '✓ PASS' : '✗ FAIL');
        
    } catch (error) {
        console.error('Error testing website analysis:', error.message);
    }
}

testWebsiteAnalysis();