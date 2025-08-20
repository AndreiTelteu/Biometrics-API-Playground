/**
 * LogsViewer Component Tests
 * Testing the web interface logs viewer functionality
 */

// Mock DOM elements for testing
const mockDOMElements = {
    logsContent: { innerHTML: '', appendChild: jest.fn(), querySelectorAll: jest.fn(() => []), querySelector: jest.fn() },
    logLevelFilter: { value: 'all', addEventListener: jest.fn() },
    logSearchInput: { value: '', addEventListener: jest.fn() },
    pauseLogsBtn: { classList: { add: jest.fn(), remove: jest.fn() }, addEventListener: jest.fn() },
    pauseLogsIcon: { textContent: '⏸️' }
};

// Mock document.getElementById
global.document = {
    getElementById: jest.fn((id) => mockDOMElements[id] || null),
    createElement: jest.fn(() => ({
        className: '',
        dataset: {},
        innerHTML: '',
        textContent: '',
        appendChild: jest.fn()
    })),
    head: { appendChild: jest.fn() }
};

// Mock DOM element creation
global.Element = class Element {
    constructor() {
        this.innerHTML = '';
        this.textContent = '';
        this.className = '';
        this.dataset = {};
    }
};

class LogsViewer {
    constructor() {
        this.maxLogEntries = 1000;
        this.logEntries = [];
        this.filteredEntries = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.isPaused = false;
        this.pendingEntries = [];
        this.init();
    }
    
    init() {
        this.logsContent = document.getElementById('logsContent');
        this.logLevelFilter = document.getElementById('logLevelFilter');
        this.logSearchInput = document.getElementById('logSearchInput');
        this.pauseLogsBtn = document.getElementById('pauseLogsBtn');
        this.pauseLogsIcon = document.getElementById('pauseLogsIcon');
        
        this.setupAutoScroll();
        this.setupFilterControls();
        this.setupSearchControls();
        this.setupPauseControls();
    }
    
    setupFilterControls() {
        if (this.logLevelFilter) {
            this.logLevelFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyFilters();
            });
        }
    }
    
    setupSearchControls() {
        if (this.logSearchInput) {
            let searchTimeout;
            this.logSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchTerm = e.target.value.toLowerCase();
                    this.applyFilters();
                }, 300);
            });
        }
    }
    
    setupPauseControls() {
        if (this.pauseLogsBtn) {
            this.pauseLogsBtn.addEventListener('click', () => {
                this.togglePause();
            });
        }
    }
    
    addLogEntry(logEntry) {
        const normalizedEntry = {
            level: logEntry.level || 'info',
            message: logEntry.message || '',
            timestamp: logEntry.timestamp || new Date().toISOString(),
            source: logEntry.source || 'app',
            ...logEntry
        };
        
        this.logEntries.push(normalizedEntry);
        
        if (this.logEntries.length > this.maxLogEntries) {
            this.logEntries = this.logEntries.slice(-this.maxLogEntries);
            this.refreshFilteredEntries();
        }
        
        if (this.isPaused) {
            this.pendingEntries.push(normalizedEntry);
        } else {
            if (this.matchesCurrentFilter(normalizedEntry)) {
                this.renderLogEntry(normalizedEntry);
            }
        }
    }
    
    matchesCurrentFilter(logEntry) {
        if (this.currentFilter !== 'all' && logEntry.level !== this.currentFilter) {
            return false;
        }
        
        if (this.searchTerm && !logEntry.message.toLowerCase().includes(this.searchTerm)) {
            return false;
        }
        
        return true;
    }
    
    applyFilters() {
        this.refreshFilteredEntries();
        this.renderAllLogs();
    }
    
    refreshFilteredEntries() {
        this.filteredEntries = this.logEntries.filter(entry => this.matchesCurrentFilter(entry));
    }
    
    renderAllLogs() {
        if (!this.logsContent) return;
        
        this.logsContent.innerHTML = '';
        
        if (this.filteredEntries.length === 0) {
            this.logsContent.innerHTML = `
                <div style="color: #718096; text-align: center; padding: 2rem;">
                    ${this.logEntries.length === 0 ? 'No logs yet.' : 'No logs match current filter.'}
                </div>
            `;
            return;
        }
        
        const recentEntries = this.filteredEntries.slice(-500);
        recentEntries.forEach(entry => {
            this.renderLogEntry(entry);
        });
    }
    
    renderLogEntry(logEntry) {
        if (!this.logsContent) return;
        
        const logElement = document.createElement('div');
        logElement.className = `log-entry log-${logEntry.level || 'info'}`;
        logElement.dataset.timestamp = logEntry.timestamp;
        logElement.dataset.level = logEntry.level;
        
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        const level = (logEntry.level || 'info').toUpperCase();
        const source = logEntry.source ? `[${logEntry.source}]` : '';
        
        let message = this.escapeHtml(logEntry.message);
        if (this.searchTerm) {
            const regex = new RegExp(`(${this.escapeRegex(this.searchTerm)})`, 'gi');
            message = message.replace(regex, '<mark>$1</mark>');
        }
        
        logElement.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-level">[${level}]</span>
            ${source ? `<span class="log-source">${source}</span>` : ''}
            <span class="log-message">${message}</span>
        `;
        
        this.logsContent.appendChild(logElement);
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.pauseLogsBtn && this.pauseLogsIcon) {
            if (this.isPaused) {
                this.pauseLogsBtn.classList.add('active');
                this.pauseLogsIcon.textContent = '▶️';
            } else {
                this.pauseLogsBtn.classList.remove('active');
                this.pauseLogsIcon.textContent = '⏸️';
                this.processPendingEntries();
            }
        }
    }
    
    processPendingEntries() {
        if (this.pendingEntries.length > 0) {
            this.pendingEntries.forEach(entry => {
                if (this.matchesCurrentFilter(entry)) {
                    this.renderLogEntry(entry);
                }
            });
            this.pendingEntries = [];
        }
    }
    
    clearLogs() {
        this.logEntries = [];
        this.filteredEntries = [];
        this.pendingEntries = [];
        
        if (this.logsContent) {
            this.logsContent.innerHTML = `
                <div style="color: #718096; text-align: center; padding: 2rem;">
                    Logs cleared. New entries will appear here.
                </div>
            `;
        }
        
        if (this.logLevelFilter) {
            this.logLevelFilter.value = 'all';
            this.currentFilter = 'all';
        }
        
        if (this.logSearchInput) {
            this.logSearchInput.value = '';
            this.searchTerm = '';
        }
        
        // Add a log entry indicating logs were cleared
        this.addLogEntry({
            level: 'info',
            message: 'Logs cleared by user',
            timestamp: new Date().toISOString(),
            source: 'web-control'
        });
    }
    
    setupAutoScroll() {
        this.shouldAutoScroll = true;
    }
    
    escapeHtml(text) {
        // Simple HTML escaping for testing
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

describe('LogsViewer', () => {
    let logsViewer;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Reset mock DOM elements
        Object.keys(mockDOMElements).forEach(key => {
            if (mockDOMElements[key].innerHTML !== undefined) {
                mockDOMElements[key].innerHTML = '';
            }
            if (mockDOMElements[key].value !== undefined) {
                mockDOMElements[key].value = key === 'logLevelFilter' ? 'all' : '';
            }
        });
        
        logsViewer = new LogsViewer();
    });
    
    describe('Initialization', () => {
        test('should initialize with default values', () => {
            expect(logsViewer.maxLogEntries).toBe(1000);
            expect(logsViewer.logEntries).toEqual([]);
            expect(logsViewer.filteredEntries).toEqual([]);
            expect(logsViewer.currentFilter).toBe('all');
            expect(logsViewer.searchTerm).toBe('');
            expect(logsViewer.isPaused).toBe(false);
            expect(logsViewer.pendingEntries).toEqual([]);
        });
        
        test('should find DOM elements', () => {
            expect(logsViewer.logsContent).toBeTruthy();
            expect(logsViewer.logLevelFilter).toBeTruthy();
            expect(logsViewer.logSearchInput).toBeTruthy();
            expect(logsViewer.pauseLogsBtn).toBeTruthy();
            expect(logsViewer.pauseLogsIcon).toBeTruthy();
        });
    });
    
    describe('Adding Log Entries', () => {
        test('should add log entry with default values', () => {
            const logEntry = {
                message: 'Test message'
            };
            
            logsViewer.addLogEntry(logEntry);
            
            expect(logsViewer.logEntries).toHaveLength(1);
            expect(logsViewer.logEntries[0].level).toBe('info');
            expect(logsViewer.logEntries[0].message).toBe('Test message');
            expect(logsViewer.logEntries[0].source).toBe('app');
            expect(logsViewer.logEntries[0].timestamp).toBeTruthy();
        });
        
        test('should add log entry with custom values', () => {
            const logEntry = {
                level: 'error',
                message: 'Error message',
                source: 'test',
                timestamp: '2023-01-01T00:00:00.000Z'
            };
            
            logsViewer.addLogEntry(logEntry);
            
            expect(logsViewer.logEntries).toHaveLength(1);
            expect(logsViewer.logEntries[0]).toMatchObject(logEntry);
        });
        
        test('should limit log entries to maxLogEntries', () => {
            logsViewer.maxLogEntries = 3;
            
            for (let i = 0; i < 5; i++) {
                logsViewer.addLogEntry({
                    message: `Message ${i}`
                });
            }
            
            expect(logsViewer.logEntries).toHaveLength(3);
            expect(logsViewer.logEntries[0].message).toBe('Message 2');
            expect(logsViewer.logEntries[2].message).toBe('Message 4');
        });
        
        test('should handle pending entries when paused', () => {
            logsViewer.isPaused = true;
            
            logsViewer.addLogEntry({
                message: 'Pending message'
            });
            
            expect(logsViewer.pendingEntries).toHaveLength(1);
            expect(logsViewer.pendingEntries[0].message).toBe('Pending message');
        });
    });
    
    describe('Filtering', () => {
        beforeEach(() => {
            // Add test log entries
            logsViewer.addLogEntry({ level: 'info', message: 'Info message' });
            logsViewer.addLogEntry({ level: 'error', message: 'Error message' });
            logsViewer.addLogEntry({ level: 'warn', message: 'Warning message' });
            logsViewer.addLogEntry({ level: 'debug', message: 'Debug message' });
        });
        
        test('should filter by log level', () => {
            logsViewer.currentFilter = 'error';
            logsViewer.applyFilters();
            
            expect(logsViewer.filteredEntries).toHaveLength(1);
            expect(logsViewer.filteredEntries[0].level).toBe('error');
        });
        
        test('should filter by search term', () => {
            logsViewer.searchTerm = 'warning';
            logsViewer.applyFilters();
            
            expect(logsViewer.filteredEntries).toHaveLength(1);
            expect(logsViewer.filteredEntries[0].message).toBe('Warning message');
        });
        
        test('should combine level and search filters', () => {
            logsViewer.currentFilter = 'info';
            logsViewer.searchTerm = 'info';
            logsViewer.applyFilters();
            
            expect(logsViewer.filteredEntries).toHaveLength(1);
            expect(logsViewer.filteredEntries[0].level).toBe('info');
            expect(logsViewer.filteredEntries[0].message).toBe('Info message');
        });
        
        test('should show all entries when filter is "all"', () => {
            logsViewer.currentFilter = 'all';
            logsViewer.applyFilters();
            
            expect(logsViewer.filteredEntries).toHaveLength(4);
        });
    });
    
    describe('Pause/Resume Functionality', () => {
        test('should toggle pause state', () => {
            expect(logsViewer.isPaused).toBe(false);
            
            logsViewer.togglePause();
            expect(logsViewer.isPaused).toBe(true);
            
            logsViewer.togglePause();
            expect(logsViewer.isPaused).toBe(false);
        });
        
        test('should process pending entries when resuming', () => {
            logsViewer.isPaused = true;
            logsViewer.pendingEntries = [
                { level: 'info', message: 'Pending 1' },
                { level: 'error', message: 'Pending 2' }
            ];
            
            logsViewer.togglePause(); // Resume
            
            expect(logsViewer.isPaused).toBe(false);
            expect(logsViewer.pendingEntries).toHaveLength(0);
        });
    });
    
    describe('Clear Logs', () => {
        test('should clear all log data', () => {
            logsViewer.addLogEntry({ message: 'Test message' });
            logsViewer.pendingEntries = [{ message: 'Pending' }];
            logsViewer.currentFilter = 'error';
            logsViewer.searchTerm = 'test';
            
            logsViewer.clearLogs();
            
            // clearLogs adds a "logs cleared" entry, so we expect 1 entry
            expect(logsViewer.logEntries.length).toBeGreaterThanOrEqual(1);
            expect(logsViewer.filteredEntries).toHaveLength(0);
            expect(logsViewer.pendingEntries).toHaveLength(0);
            expect(logsViewer.currentFilter).toBe('all');
            expect(logsViewer.searchTerm).toBe('');
        });
    });
    
    describe('Filter Matching', () => {
        test('should match entries correctly', () => {
            const entry1 = { level: 'info', message: 'Test message' };
            const entry2 = { level: 'error', message: 'Error occurred' };
            
            logsViewer.currentFilter = 'info';
            logsViewer.searchTerm = '';
            
            expect(logsViewer.matchesCurrentFilter(entry1)).toBe(true);
            expect(logsViewer.matchesCurrentFilter(entry2)).toBe(false);
            
            logsViewer.currentFilter = 'all';
            logsViewer.searchTerm = 'error';
            
            expect(logsViewer.matchesCurrentFilter(entry1)).toBe(false);
            expect(logsViewer.matchesCurrentFilter(entry2)).toBe(true);
        });
    });
    
    describe('DOM Rendering', () => {
        test('should call appendChild when rendering log entry', () => {
            const logEntry = {
                level: 'info',
                message: 'Test message',
                timestamp: '2023-01-01T12:00:00.000Z',
                source: 'test'
            };
            
            logsViewer.renderLogEntry(logEntry);
            
            // Verify that appendChild was called on logsContent
            expect(logsViewer.logsContent.appendChild).toHaveBeenCalled();
        });
        
        test('should escape HTML in log messages', () => {
            const logEntry = {
                level: 'info',
                message: '<script>alert("xss")</script>',
                timestamp: '2023-01-01T12:00:00.000Z'
            };
            
            // Test the escapeHtml method directly
            const escaped = logsViewer.escapeHtml(logEntry.message);
            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;script&gt;');
        });
        
        test('should escape regex characters in search terms', () => {
            const searchTerm = '.*+?^${}()|[]\\';
            const escaped = logsViewer.escapeRegex(searchTerm);
            
            // All special regex characters should be escaped
            expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
        });
    });
});