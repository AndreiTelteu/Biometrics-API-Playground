/**
 * Accessibility Audit Script
 * Run comprehensive accessibility audit and generate report
 */

const { logAccessibilityAudit, generateAccessibilityReport } = require('../src/utils/accessibilityAudit');
const fs = require('fs');
const path = require('path');

// Run the audit
console.log('Running accessibility audit...\n');

try {
  // Log to console
  logAccessibilityAudit();
  
  // Generate report file
  const report = generateAccessibilityReport();
  const reportPath = path.join(__dirname, '..', 'accessibility-report.md');
  
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  console.log('\n✅ Accessibility audit completed successfully!');
} catch (error) {
  console.error('❌ Error running accessibility audit:', error);
  process.exit(1);
}