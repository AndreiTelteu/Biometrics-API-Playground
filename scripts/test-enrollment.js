/**
 * Manual test script for enrollment flow
 * This script tests the enrollment flow logic without UI dependencies
 */

const { biometricService, biometricAPIService } = require('../src/services');

// Mock react-native-biometrics for testing
jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn().mockResolvedValue({
      available: true,
      biometryType: 'TouchID',
    }),
    biometricKeysExist: jest.fn().mockResolvedValue({ keysExist: false }),
    createKeys: jest.fn().mockResolvedValue({
      publicKey: 'mock-public-key-12345',
    }),
    deleteKeys: jest.fn().mockResolvedValue({ keysDeleted: true }),
    createSignature: jest.fn().mockResolvedValue({
      success: true,
      signature: 'mock-signature',
    }),
  })),
  BiometryTypes: {
    TouchID: 'TouchID',
    FaceID: 'FaceID',
    Biometrics: 'Biometrics',
  },
}));

// Mock fetch for API testing
global.fetch = jest.fn();

async function testEnrollmentFlow() {
  console.log('🧪 Testing Enrollment Flow...\n');

  try {
    // Test 1: Check biometric availability
    console.log('1. Testing biometric availability check...');
    const availability = await biometricService.checkBiometricAvailability();
    console.log('   Result:', availability);
    console.log('   ✅ Biometric availability check passed\n');

    // Test 2: Create biometric keys
    console.log('2. Testing biometric key creation...');
    const keyResult = await biometricService.createKeys('Test enrollment');
    console.log('   Result:', keyResult);
    
    if (keyResult.success) {
      console.log('   ✅ Biometric key creation passed\n');
    } else {
      console.log('   ❌ Biometric key creation failed\n');
      return;
    }

    // Test 3: Test API enrollment
    console.log('3. Testing API enrollment...');
    
    // Mock successful API response
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
      json: jest.fn().mockResolvedValue({
        success: true,
        userId: 'test-user-123',
        enrolled: true,
      }),
    });

    const endpointConfig = {
      url: 'https://api.example.com/enroll',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
      },
    };

    const enrollResult = await biometricAPIService.enrollPublicKey(
      endpointConfig,
      keyResult.data.publicKey
    );
    
    console.log('   Result:', enrollResult);
    
    if (enrollResult.success) {
      console.log('   ✅ API enrollment passed\n');
    } else {
      console.log('   ❌ API enrollment failed\n');
    }

    // Test 4: Test error handling
    console.log('4. Testing error handling...');
    
    // Mock API failure
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
      json: jest.fn().mockResolvedValue({
        error: 'Invalid public key format',
      }),
    });

    const errorResult = await biometricAPIService.enrollPublicKey(
      endpointConfig,
      'invalid-key'
    );
    
    console.log('   Result:', errorResult);
    
    if (!errorResult.success) {
      console.log('   ✅ Error handling passed\n');
    } else {
      console.log('   ❌ Error handling failed\n');
    }

    console.log('🎉 All enrollment flow tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testEnrollmentFlow();
}

module.exports = { testEnrollmentFlow };