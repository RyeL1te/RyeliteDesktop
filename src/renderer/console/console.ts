// Copyright (C) 2025  HighLite

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
import { setupWindowControls } from '../helper';

class ConsoleManager {
    messages: any[];
    currentFilter: string;

    constructor() {
        this.messages = [];
        this.currentFilter = 'all';
        this.init();
    }

    init(): void {
        this.bindEvents();
        this.setupIPCListeners();
    }

    setupIPCListeners(): void {
        window.electron.ipcRenderer.on('add-console-message', (_, data) => {
            if (data.level === 'debug') {
                return; // Skip debug messages
            }
            this.addMessage(
                data.level,
                data.text,
                `${data.source} @ ${data.lineNumber}`
            );
        });
    }

    bindEvents(): void {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const type = (e.target as HTMLElement).dataset.type;

                return type ? this.setFilter(type) : undefined;
            });
        });

        // Clear button
        document
            .getElementById('clearConsole')
            ?.addEventListener('click', () => {
                this.clearMessages();
            });
    }

    formatMessage(args: any[]): string {
        return args
            .map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return arg.toString();
                    }
                }

                return String(arg);
            })
            .join(' ');
    }

    addMessage(
        type: string,
        message: string,
        source: string,
        timestamp: Date = new Date()
    ): void {
        const messageObj = {
            id: Date.now() + Math.random(),
            type,
            message,
            source,
            timestamp: timestamp,
        };

        this.messages.unshift(messageObj); // Add to beginning for newest first

        // Keep only last 1000 messages
        if (this.messages.length > 1000)
            this.messages = this.messages.slice(0, 1000);

        this.storeMessages();
        this.renderMessages();
    }

    setFilter(type: string): void {
        this.currentFilter = type;

        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle(
                'active',
                (btn as HTMLElement).dataset.type === type
            );
        });

        this.renderMessages();
    }

    clearMessages(): void {
        this.messages = [];
        this.storeMessages();
        this.renderMessages();
    }

    renderMessages(): void {
        const content = document.getElementById(
            'console-content'
        ) as HTMLElement;
        const emptyState = document.getElementById('emptyState');

        let filteredMessages = this.messages;
        if (this.currentFilter !== 'all')
            filteredMessages = this.messages.filter(
                msg => msg.type === this.currentFilter
            );

        if (filteredMessages.length === 0) {
            (emptyState?.style as any).display = 'block';
            const existingRows = content?.querySelectorAll('.console-row');
            existingRows?.forEach(row => row.remove());
            return;
        }

        (emptyState?.style as any).display = 'none';

        const existingRows = content?.querySelectorAll('.console-row');
        existingRows?.forEach(row => row.remove());

        filteredMessages.forEach(msg => {
            const row = this.createMessageRow(msg);
            content?.appendChild(row);
        });
    }

    truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;

        return text.substring(0, maxLength - 3) + '...';
    }

    createMessageRow(message: any): HTMLElement {
        const row = document.createElement('div');
        row.className = `console-row ${message.type}`;

        const timestamp = message.timestamp.toLocaleTimeString();
        const truncatedMessage = this.truncateText(message.message, 100);
        const truncatedSource = this.truncateText(message.source, 30);

        row.innerHTML = `
            <div class="timestamp">${timestamp}</div>
            <div class="message" title="${this.escapeHtml(message.message)}">${this.escapeHtml(truncatedMessage)}</div>
            <div class="plugin" title="${this.escapeHtml(message.source)}">${this.escapeHtml(truncatedSource)}</div>
        `;

        // Add click handler to copy message
        row.addEventListener('click', () => {
            navigator.clipboard.writeText(
                `[${timestamp}] ${message.type.toUpperCase()}: ${message.message} (${message.source})`
            );
            this.showToast('Message copied to clipboard');
        });

        return row;
    }

    escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;

        return div.innerHTML;
    }

    showToast(message: string): void {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--theme-background-soft);
            color: var(--theme-text-primary);
            padding: 12px 16px;
            border-radius: 4px;
            border: 1px solid var(--theme-border);
            z-index: 1000;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(toast);

        // Fade in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    storeMessages() {
        try {
            localStorage.setItem(
                'highlite-console-messages',
                JSON.stringify(this.messages.slice(0, 100))
            );
        } catch (e) {
            console.warn('Failed to store console messages:', e);
        }
    }
}

const consoleManager = new ConsoleManager();
consoleManager.init();
import '@iconify/iconify';

// Window control handlers @see {helper.ts} -> new function for handling window controls
setupWindowControls();

// Initialize window controls when DOM is ready
document.addEventListener('DOMContentLoaded', setupWindowControls);
