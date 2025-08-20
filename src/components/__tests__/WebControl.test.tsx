/**
 * WebControl Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { WebControl } from '../WebControl';
import { webServerService } from '../../services';

// Mock the theme hook
jest.mock('../../theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        surface: '#FFFFFF',
        background: '#F2F2F7',
        text: '#000000',
        primary: '#0056CC',
        error: '#CC2914',
        success: '#1B8B3A',
      },
      typography: {
        sizes: { lg: 18, sm: 14, base: 16 },
        weights: { bold: '700', medium: '500' },
      },
      spacing: { md: 16, sm: 8, lg: 24 },
      borderRadius: { md: 12, sm: 8 },
    },
  }),
}));

// Mock the web server service
jest.mock('../../services', () => ({
  webServerService: {
    getServerStatus: jest.fn(),
    startServer: jest.fn(),
    stopServer: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockWebServerService = webServerService as jest.Mocked<typeof webServerService>;

describe('WebControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebServerService.getServerStatus.mockReturnValue({
      isRunning: false,
      port: null,
      url: null,
      password: null,
      startTime: null,
      activeConnections: 0,
    });
  });

  it('renders correctly when server is stopped', () => {
    const { getByText } = render(<WebControl />);
    
    expect(getByText('Web Control')).toBeTruthy();
    expect(getByText('Stopped')).toBeTruthy();
    expect(getByText('Start Web Server')).toBeTruthy();
    expect(getByText(/Start the web server to control this app remotely/)).toBeTruthy();
  });

  it('renders correctly when server is running', () => {
    mockWebServerService.getServerStatus.mockReturnValue({
      isRunning: true,
      port: 8080,
      url: 'http://0.0.0.0:8080',
      password: '123456',
      startTime: new Date('2023-01-01T10:00:00Z'),
      activeConnections: 2,
    });

    const { getByText } = render(<WebControl />);
    
    expect(getByText('Running')).toBeTruthy();
    expect(getByText('Stop Web Server')).toBeTruthy();
    expect(getByText('http://0.0.0.0:8080')).toBeTruthy();
    expect(getByText('8080')).toBeTruthy();
    expect(getByText('123456')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });

  it('starts server when start button is pressed', async () => {
    mockWebServerService.startServer.mockResolvedValue({
      port: 8080,
      url: 'http://0.0.0.0:8080',
      password: '123456',
      isRunning: true,
    });

    const { getByText } = render(<WebControl />);
    const startButton = getByText('Start Web Server');
    
    fireEvent.press(startButton);
    
    await waitFor(() => {
      expect(mockWebServerService.startServer).toHaveBeenCalled();
    });
  });

  it('shows confirmation dialog when stopping server', async () => {
    mockWebServerService.getServerStatus.mockReturnValue({
      isRunning: true,
      port: 8080,
      url: 'http://0.0.0.0:8080',
      password: '123456',
      startTime: new Date(),
      activeConnections: 0,
    });

    const { getByText } = render(<WebControl />);
    const stopButton = getByText('Stop Web Server');
    
    fireEvent.press(stopButton);
    
    expect(Alert.alert).toHaveBeenCalledWith(
      'Stop Web Server',
      'Are you sure you want to stop the web server? This will disconnect all active sessions.',
      expect.any(Array)
    );
  });

  it('calls onServerStatusChange callback when provided', () => {
    const mockCallback = jest.fn();
    
    render(<WebControl onServerStatusChange={mockCallback} />);
    
    expect(mockCallback).toHaveBeenCalledWith({
      isRunning: false,
      port: null,
      url: null,
      password: null,
      startTime: null,
      activeConnections: 0,
    });
  });
});