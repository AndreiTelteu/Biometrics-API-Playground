// Simple test to check Alert mock
const mockAlert = jest.fn();

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert = {
    alert: mockAlert,
  };
  return RN;
});

const { Alert } = require('react-native');

describe('Alert Mock Test', () => {
  it('should call mocked Alert.alert', () => {
    Alert.alert('Test', 'Message');
    expect(mockAlert).toHaveBeenCalledWith('Test', 'Message');
  });
});