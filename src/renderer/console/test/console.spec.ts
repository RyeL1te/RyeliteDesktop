import { describe, it, expect, beforeEach } from 'vitest';

class MockConsoleManager {
    messages: any[];
    currentFilter: string;

    constructor() {
        this.messages = [];
        this.currentFilter = 'all';
    }

    addMessage(type: string, message: string, source: string) {
        const messageObj = {
            id: Date.now() + Math.random(),
            type,
            message,
            source,
            timestamp: new Date(),
        };
        this.messages.unshift(messageObj);
        if (this.messages.length > 1000) {
            this.messages = this.messages.slice(0, 1000);
        }
    }

    setFilter(type: string) {
        this.currentFilter = type;
    }

    clearMessages() {
        this.messages = [];
    }

    formatMessage(args: any[]) {
        return args
            .map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return arg.toString();
                    }
                }
                return String(arg);
            })
            .join(' ');
    }

    truncateText(text: string, maxLength: number) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    escapeHtml(text: string) {
        return text.replace(/[&<>"']/g, function (match) {
            const escape: { [key: string]: string } = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
            };
            return escape[match];
        });
    }
}

describe('Console Manager', () => {
    let consoleManager: MockConsoleManager;

    beforeEach(() => {
        consoleManager = new MockConsoleManager();
    });

    describe('Basic Functionality', () => {
        it('should initialize with empty state', () => {
            expect(consoleManager.messages).toEqual([]);
            expect(consoleManager.currentFilter).toBe('all');
        });

        it('should add messages correctly', () => {
            consoleManager.addMessage('error', 'Test error', 'test.js @ 123');

            expect(consoleManager.messages).toHaveLength(1);
            expect(consoleManager.messages[0].type).toBe('error');
            expect(consoleManager.messages[0].message).toBe('Test error');
            expect(consoleManager.messages[0].source).toBe('test.js @ 123');
        });

        it('should limit messages to 1000', () => {
            for (let i = 0; i < 1005; i++) {
                consoleManager.addMessage('info', `Message ${i}`, 'test.js');
            }

            expect(consoleManager.messages).toHaveLength(1000);
        });

        it('should clear all messages', () => {
            consoleManager.addMessage('info', 'Test', 'test.js');
            consoleManager.clearMessages();

            expect(consoleManager.messages).toHaveLength(0);
        });
    });

    describe('Filtering', () => {
        it('should set filter type', () => {
            consoleManager.setFilter('error');
            expect(consoleManager.currentFilter).toBe('error');
        });
    });

    describe('Text Processing', () => {
        it('should format object messages', () => {
            const result = consoleManager.formatMessage([
                'Hello',
                { test: 'value' },
            ]);

            expect(result).toContain('Hello');
            expect(result).toContain('test');
            expect(result).toContain('value');
        });

        it('should truncate long text', () => {
            const longText = 'a'.repeat(200);
            const result = consoleManager.truncateText(longText, 50);

            expect(result).toHaveLength(50);
            expect(result.endsWith('...')).toBe(true);
        });

        it('should escape HTML', () => {
            const html = '<script>alert("xss")</script>';
            const result = consoleManager.escapeHtml(html);

            expect(result).toBe(
                '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
            );
        });
    });
});
