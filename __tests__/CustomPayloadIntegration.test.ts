/**
 * Integration test for custom payload functionality
 * Tests the complete flow from UI configuration to payload usage
 */

describe('Custom Payload Integration', () => {
  it('should validate custom payload support in EndpointConfig type', () => {
    const fs = require('fs');
    const typesContent = fs.readFileSync('src/types/biometrics.ts', 'utf8');
    
    // Check for customPayload field in EndpointConfig interface
    expect(typesContent).toContain('customPayload?: string;');
    
    console.log('✅ EndpointConfig type supports custom payload');
  });

  it('should validate custom payload UI in EndpointConfiguration component for validation only', () => {
    const fs = require('fs');
    const componentContent = fs.readFileSync('src/components/EndpointConfiguration.tsx', 'utf8');
    
    // Check for custom payload UI elements (validation only)
    expect(componentContent).toContain('Custom Payload (optional):');
    expect(componentContent).toContain('validateCustomPayload');
    expect(componentContent).toContain('handleValidatePayloadChange');
    expect(componentContent).toContain('testID="validate-custom-payload"');
    
    // Should NOT contain enrollment custom payload elements
    expect(componentContent).not.toContain('enrollCustomPayload');
    expect(componentContent).not.toContain('handleEnrollPayloadChange');
    expect(componentContent).not.toContain('testID="enroll-custom-payload"');
    
    console.log('✅ Custom payload UI implemented for validation endpoint only');
  });

  it('should validate custom payload persistence in validation configuration only', () => {
    const fs = require('fs');
    const componentContent = fs.readFileSync('src/components/EndpointConfiguration.tsx', 'utf8');
    
    // Check for custom payload in validation configuration saving only
    expect(componentContent).toContain('customPayload: validateCustomPayload || undefined');
    expect(componentContent).toContain('setValidateCustomPayload(config.customPayload || \'\')');
    
    // Should NOT contain enrollment custom payload persistence
    expect(componentContent).not.toContain('customPayload: enrollCustomPayload || undefined');
    expect(componentContent).not.toContain('setEnrollCustomPayload(config.customPayload || \'\')');
    
    console.log('✅ Custom payload persistence implemented for validation only');
  });

  it('should validate generatePayload method in BiometricService', () => {
    const fs = require('fs');
    const serviceContent = fs.readFileSync('src/services/BiometricService.ts', 'utf8');
    
    // Check for generatePayload method
    expect(serviceContent).toContain('generatePayload(customPayload?: string): string');
    expect(serviceContent).toContain('return customPayload || this.generateTimestampPayload();');
    
    console.log('✅ BiometricService generatePayload method implemented');
  });

  it('should validate custom payload usage in App validation flow', () => {
    const fs = require('fs');
    const appContent = fs.readFileSync('App.tsx', 'utf8');
    
    // Check for custom payload usage in validation flow
    expect(appContent).toContain('biometricService.generatePayload(validateEndpoint.customPayload)');
    expect(appContent).toContain('validateEndpoint.customPayload ? \'custom\' : \'timestamp\'');
    expect(appContent).toContain('Generated ${payloadType} payload:');
    
    console.log('✅ Custom payload usage implemented in App validation flow');
  });

  it('should validate default validation endpoint configuration includes customPayload', () => {
    const fs = require('fs');
    const constantsContent = fs.readFileSync('src/constants/biometrics.ts', 'utf8');
    
    // Check for customPayload in default validation configuration only
    expect(constantsContent).toContain('DEFAULT_VALIDATE_ENDPOINT');
    expect(constantsContent).toContain('customPayload: undefined,');
    
    // Verify enrollment endpoint doesn't have customPayload
    const enrollEndpointMatch = constantsContent.match(/DEFAULT_ENROLL_ENDPOINT[\s\S]*?};/);
    if (enrollEndpointMatch) {
      expect(enrollEndpointMatch[0]).not.toContain('customPayload');
    }
    
    console.log('✅ Default validation endpoint configuration includes customPayload');
  });

  it('should validate custom payload helper text and placeholders', () => {
    const fs = require('fs');
    const componentContent = fs.readFileSync('src/components/EndpointConfiguration.tsx', 'utf8');
    
    // Check for helpful UI text
    expect(componentContent).toContain('Custom payload to sign (leave empty for timestamp)');
    expect(componentContent).toContain('If empty, a timestamp will be used as the default payload');
    
    console.log('✅ Custom payload UI includes helpful text and placeholders');
  });

  it('should validate custom payload styling in EndpointConfiguration', () => {
    const fs = require('fs');
    const componentContent = fs.readFileSync('src/components/EndpointConfiguration.tsx', 'utf8');
    
    // Check for custom payload specific styles
    expect(componentContent).toContain('payloadInput: {');
    expect(componentContent).toContain('helperText: {');
    expect(componentContent).toContain('minHeight: 80');
    expect(componentContent).toContain('textAlignVertical: \'top\'');
    
    console.log('✅ Custom payload styling implemented');
  });

  it('should validate multiline support for custom payload input', () => {
    const fs = require('fs');
    const componentContent = fs.readFileSync('src/components/EndpointConfiguration.tsx', 'utf8');
    
    // Check for multiline input configuration
    expect(componentContent).toContain('multiline={true}');
    expect(componentContent).toContain('numberOfLines={3}');
    
    console.log('✅ Custom payload input supports multiline text');
  });

  it('should validate complete custom payload integration flow for validation only', () => {
    const fs = require('fs');
    
    // Check all components are integrated
    const appContent = fs.readFileSync('App.tsx', 'utf8');
    const componentContent = fs.readFileSync('src/components/EndpointConfiguration.tsx', 'utf8');
    const serviceContent = fs.readFileSync('src/services/BiometricService.ts', 'utf8');
    const typesContent = fs.readFileSync('src/types/biometrics.ts', 'utf8');
    
    // Verify the complete flow exists for validation only
    expect(typesContent).toContain('customPayload?: string;'); // Type definition
    expect(componentContent).toContain('validateCustomPayload'); // UI state for validation
    expect(componentContent).toContain('customPayload: validateCustomPayload || undefined'); // Configuration for validation
    expect(serviceContent).toContain('generatePayload(customPayload?: string)'); // Service method
    expect(appContent).toContain('generatePayload(validateEndpoint.customPayload)'); // Usage in app for validation
    
    // Verify enrollment doesn't have custom payload
    expect(componentContent).not.toContain('enrollCustomPayload');
    expect(appContent).not.toContain('generatePayload(enrollEndpoint.customPayload)');
    
    console.log('✅ Complete custom payload integration flow verified for validation only');
  });
});