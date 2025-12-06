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

import { selector, channel } from './helper.d';

/**
 * @author { @Override }
 * @since { 20251204 : @21:13 }
 * ============================
 *
 * Definition: windowControls
 *
 * > Holds the window controls (minimize, maximize, close) and their respective channels
 *
 */

const windowControls: Array<{ selector: selector; channel: channel }> = [
    { selector: '#minimizeBtn', channel: 'minimize-window' },
    { selector: '#maximizeBtn', channel: 'toggle-maximize-window' },
    { selector: '#closeBtn', channel: 'close-window' },
] as const;

/**
 *
 * Definition: checkDarwin
 *
 * > Checks thes current operating system and holds these two conditions:
 * > 1. The OS is Darwin (macOS) => We hide the window controls
 * > 2. The OS is not Darwin (macOS) => We hide the Darwin spacer
 *
 * Why did I create this function?
 *
 * > Because we are creating the same logic across multiple files, so I created a helper function to hold this logic - Simplicity :* (chef kiss)
 *
 **/

export const checkDarwin: () => boolean = () => {
    const isDarwin = window.electron.process.platform === 'darwin';

    if (isDarwin) {
        document.getElementById('window-controls')?.remove();
        return isDarwin;
    } else {
        document.getElementById('darwin-spacer')?.remove();
        return isDarwin;
    }
};

/**
 *
 * Definition: onClickSend
 *
 * > Sends the channel to the main process - what that means is the DOM element is found and the click event is added
 *
 **/

export const onClickSend = (selector: selector, channel: channel) => {
    const button = document.querySelector<HTMLAnchorElement>(selector);

    console.log('hit!');
    if (!button) return;

    button?.addEventListener('click', () => {
        window.electron.ipcRenderer.send(channel);
    });
};

/**
 * Definition: setupWindowControls
 *
 * > Setups the window controls i.e., the minimize, maximize, close buttons and calls the checkDarwin function
 *
 **/

export const setupWindowControls = () => {
    checkDarwin();

    console.log('ping');
    windowControls.forEach(control => {
        onClickSend(control.selector, control.channel);
    });
};
