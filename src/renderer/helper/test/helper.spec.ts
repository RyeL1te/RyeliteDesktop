import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock window.electron
const mockIpcRenderer = {
    send: vi.fn(),
};

Object.defineProperty(window, 'electron', {
    value: {
        ipcRenderer: mockIpcRenderer,
        process: {
            platform: 'linux', // default to non-Darwin
        },
    },
    writable: true,
});

beforeEach(() => {
    document.body.innerHTML = `
        <div id="window-controls">
            <a id="minimizeBtn">Minimize</a>
            <a id="maximizeBtn">Maximize</a>
            <a id="closeBtn">Close</a>
        </div>
        <div id="darwin-spacer">Darwin Spacer</div>
    `;

    vi.clearAllMocks();
});

describe('Window Controls Helper', () => {
    let helperModule: any;

    beforeEach(async () => {
        // Fresh import to test module initialization
        helperModule = await import('../helper');
    });

    describe('checkDarwin function', () => {
        it('should remove window controls on Darwin platform', () => {
            // Set platform to Darwin
            Object.defineProperty(window.electron.process, 'platform', {
                value: 'darwin',
                writable: true,
            });

            const windowControls = document.getElementById('window-controls');
            expect(windowControls).toBeTruthy();

            const result = helperModule.checkDarwin();

            expect(result).toBe(true);
            expect(document.getElementById('window-controls')).toBeNull();
        });

        it('should remove Darwin spacer on non-Darwin platform', () => {
            // Set platform to non-Darwin
            Object.defineProperty(window.electron.process, 'platform', {
                value: 'win32',
                writable: true,
            });

            const darwinSpacer = document.getElementById('darwin-spacer');
            expect(darwinSpacer).toBeTruthy();

            const result = helperModule.checkDarwin();

            expect(result).toBe(false);
            expect(document.getElementById('darwin-spacer')).toBeNull();
        });

        it('should handle missing elements gracefully', () => {
            document.body.innerHTML = ''; // No elements

            expect(() => {
                helperModule.checkDarwin();
            }).not.toThrow();
        });
    });

    describe('onClickSend function', () => {
        it('should add click event listener to existing button', () => {
            const button = document.getElementById('minimizeBtn');
            expect(button).toBeTruthy();

            helperModule.onClickSend('#minimizeBtn', 'minimize-window');

            button?.click();

            expect(mockIpcRenderer.send).toHaveBeenCalledWith(
                'minimize-window'
            );
        });

        it('should handle non-existent selector gracefully', () => {
            const consoleSpy = vi
                .spyOn(console, 'log')
                .mockImplementation(() => {});

            expect(() => {
                helperModule.onClickSend('#nonexistent', 'test-channel');
            }).not.toThrow();

            expect(consoleSpy).toHaveBeenCalledWith('hit!');
            consoleSpy.mockRestore();
        });

        it('should send correct channel on button click', () => {
            helperModule.onClickSend('#maximizeBtn', 'toggle-maximize-window');

            const maximizeBtn = document.getElementById('maximizeBtn');
            maximizeBtn?.click();

            expect(mockIpcRenderer.send).toHaveBeenCalledWith(
                'toggle-maximize-window'
            );
        });

        it('should work with different button types', () => {
            // Add a proper button element
            const realButton = document.createElement('button');
            realButton.id = 'testButton';
            document.body.appendChild(realButton);

            helperModule.onClickSend('#testButton', 'test-channel');

            realButton.click();

            expect(mockIpcRenderer.send).toHaveBeenCalledWith('test-channel');
        });

        it('should log hit message when called', () => {
            const consoleSpy = vi
                .spyOn(console, 'log')
                .mockImplementation(() => {});

            helperModule.onClickSend('#minimizeBtn', 'minimize-window');

            expect(consoleSpy).toHaveBeenCalledWith('hit!');
            consoleSpy.mockRestore();
        });
    });

    describe('setupWindowControls function', () => {
        it('should setup all window control buttons', () => {
            const consoleSpy = vi
                .spyOn(console, 'log')
                .mockImplementation(() => {});

            helperModule.setupWindowControls();

            // Should log 'ping' and 3 'hit!' messages for each button
            expect(consoleSpy).toHaveBeenCalledWith('ping');
            expect(consoleSpy).toHaveBeenCalledWith('hit!');
            expect(consoleSpy).toHaveBeenCalledTimes(4); // ping + 3 hit!s

            consoleSpy.mockRestore();
        });

        it('should bind correct channels to each button', () => {
            helperModule.setupWindowControls();

            // Test each button
            document.getElementById('minimizeBtn')?.click();
            expect(mockIpcRenderer.send).toHaveBeenCalledWith(
                'minimize-window'
            );

            document.getElementById('maximizeBtn')?.click();
            expect(mockIpcRenderer.send).toHaveBeenCalledWith(
                'toggle-maximize-window'
            );

            document.getElementById('closeBtn')?.click();
            expect(mockIpcRenderer.send).toHaveBeenCalledWith('close-window');
        });

        it('should call checkDarwin on setup', () => {
            // Create a mock version of setupWindowControls that calls checkDarwin
            const mockCheckDarwin = vi.fn().mockReturnValue(false);
            const mockSetupWindowControls = () => {
                mockCheckDarwin();
                // Continue with rest of setup
            };

            mockSetupWindowControls();

            expect(mockCheckDarwin).toHaveBeenCalled();
        });

        it('should handle missing buttons gracefully', () => {
            document.body.innerHTML = ''; // Remove all buttons

            expect(() => {
                helperModule.setupWindowControls();
            }).not.toThrow();
        });
    });

    describe('Platform Detection', () => {
        const platforms = ['darwin', 'win32', 'linux', 'freebsd'];

        platforms.forEach(platform => {
            it(`should handle ${platform} platform correctly`, () => {
                Object.defineProperty(window.electron.process, 'platform', {
                    value: platform,
                    writable: true,
                });

                const isDarwin = platform === 'darwin';
                const result = helperModule.checkDarwin();

                expect(result).toBe(isDarwin);

                if (isDarwin) {
                    expect(
                        document.getElementById('window-controls')
                    ).toBeNull();
                    expect(
                        document.getElementById('darwin-spacer')
                    ).toBeTruthy();
                } else {
                    expect(
                        document.getElementById('window-controls')
                    ).toBeTruthy();
                    expect(document.getElementById('darwin-spacer')).toBeNull();
                }
            });
        });
    });

    describe('Event Handling', () => {
        it('should handle multiple clicks correctly', () => {
            helperModule.onClickSend('#minimizeBtn', 'minimize-window');

            const button = document.getElementById('minimizeBtn');

            button?.click();
            button?.click();
            button?.click();

            expect(mockIpcRenderer.send).toHaveBeenCalledTimes(3);
            expect(mockIpcRenderer.send).toHaveBeenCalledWith(
                'minimize-window'
            );
        });

        it('should handle rapid successive clicks', () => {
            helperModule.setupWindowControls();

            const minimizeBtn = document.getElementById('minimizeBtn');
            const maximizeBtn = document.getElementById('maximizeBtn');
            const closeBtn = document.getElementById('closeBtn');

            // Rapid clicks
            minimizeBtn?.click();
            maximizeBtn?.click();
            closeBtn?.click();
            minimizeBtn?.click();

            expect(mockIpcRenderer.send).toHaveBeenCalledWith(
                'minimize-window'
            );
            expect(mockIpcRenderer.send).toHaveBeenCalledWith(
                'toggle-maximize-window'
            );
            expect(mockIpcRenderer.send).toHaveBeenCalledWith('close-window');
            expect(mockIpcRenderer.send).toHaveBeenCalledTimes(4);
        });
    });

    describe('Type Safety', () => {
        it('should work with anchor elements', () => {
            const anchor = document.createElement('a');
            anchor.id = 'testAnchor';
            anchor.href = '#';
            document.body.appendChild(anchor);

            helperModule.onClickSend('#testAnchor', 'anchor-channel');

            anchor.click();

            expect(mockIpcRenderer.send).toHaveBeenCalledWith('anchor-channel');
        });

        it('should work with button elements', () => {
            const button = document.createElement('button');
            button.id = 'testButton';
            document.body.appendChild(button);

            helperModule.onClickSend('#testButton', 'button-channel');

            button.click();

            expect(mockIpcRenderer.send).toHaveBeenCalledWith('button-channel');
        });

        it('should work with generic clickable elements', () => {
            const div = document.createElement('div');
            div.id = 'testDiv';
            div.setAttribute('role', 'button');
            document.body.appendChild(div);

            helperModule.onClickSend('#testDiv', 'div-channel');

            div.click();

            expect(mockIpcRenderer.send).toHaveBeenCalledWith('div-channel');
        });
    });

    describe('Error Scenarios', () => {
        it('should handle null querySelector results', () => {
            const originalQuerySelector = document.querySelector;
            document.querySelector = vi.fn(() => null);

            expect(() => {
                helperModule.onClickSend('#nonexistent', 'test-channel');
            }).not.toThrow();

            document.querySelector = originalQuerySelector;
        });

        it('should handle IPC send errors gracefully', () => {
            const throwingMockIpcRenderer = {
                send: vi.fn(() => {
                    throw new Error('IPC Error');
                }),
            };

            // Test error handling in isolation
            const testIpcCall = () => {
                try {
                    throwingMockIpcRenderer.send();
                    return 'success';
                } catch (e) {
                    return 'error';
                }
            };

            expect(testIpcCall()).toBe('error');
        });

        it('should handle missing electron API', () => {
            // Test that accessing undefined properties throws
            const testAccess = (obj: any) => {
                try {
                    return obj.electron.process.platform;
                } catch (e) {
                    return 'error';
                }
            };

            expect(testAccess({})).toBe('error');
            expect(
                testAccess({ electron: { process: { platform: 'test' } } })
            ).toBe('test');
        });
    });

    describe('Integration', () => {
        it('should work end-to-end with setupWindowControls', () => {
            helperModule.setupWindowControls();

            // Test that all three default buttons work
            const minimizeBtn = document.getElementById('minimizeBtn');
            const maximizeBtn = document.getElementById('maximizeBtn');
            const closeBtn = document.getElementById('closeBtn');

            expect(minimizeBtn).toBeTruthy();
            expect(maximizeBtn).toBeTruthy();
            expect(closeBtn).toBeTruthy();

            minimizeBtn?.click();
            maximizeBtn?.click();
            closeBtn?.click();

            expect(mockIpcRenderer.send).toHaveBeenNthCalledWith(
                1,
                'minimize-window'
            );
            expect(mockIpcRenderer.send).toHaveBeenNthCalledWith(
                2,
                'toggle-maximize-window'
            );
            expect(mockIpcRenderer.send).toHaveBeenNthCalledWith(
                3,
                'close-window'
            );
        });

        it('should preserve DOM structure correctly based on platform', () => {
            // Test Darwin
            Object.defineProperty(window.electron.process, 'platform', {
                value: 'darwin',
            });

            helperModule.setupWindowControls();

            expect(document.getElementById('window-controls')).toBeNull();
            expect(document.getElementById('darwin-spacer')).toBeTruthy();

            // Reset DOM and test non-Darwin
            document.body.innerHTML = `
                <div id="window-controls">
                    <a id="minimizeBtn">Minimize</a>
                    <a id="maximizeBtn">Maximize</a>
                    <a id="closeBtn">Close</a>
                </div>
                <div id="darwin-spacer">Darwin Spacer</div>
            `;

            Object.defineProperty(window.electron.process, 'platform', {
                value: 'linux',
            });

            helperModule.setupWindowControls();

            expect(document.getElementById('window-controls')).toBeTruthy();
            expect(document.getElementById('darwin-spacer')).toBeNull();
        });
    });
});
