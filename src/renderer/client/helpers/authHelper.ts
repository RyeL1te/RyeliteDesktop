// Copyright (C) 2025  HighLite

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export function setupAuthObserver() {
    let lastLoggedInState: boolean | null = null;

    const checkState = () => {
        const gameContainer = document.querySelector('#game-container');
        const loginContainer = document.querySelector('#login-screen-container');

        // Use presence and visibility to determine login status
        const isLoggedIn = !!gameContainer && (!loginContainer || (loginContainer as HTMLElement).style.display === 'none');

        if (lastLoggedInState !== isLoggedIn) {
            lastLoggedInState = isLoggedIn;
            console.log(`[AuthHelper] Auth state changed. isLoggedIn: ${isLoggedIn}`);

            // @ts-ignore - The preload api might not be perfectly typed for TS here
            if (window.discord && typeof window.discord.updateState === 'function') {
                // @ts-ignore
                window.discord.updateState(isLoggedIn);
            }
        }
    };

    // Initial check
    checkState();

    const observer = new MutationObserver(() => {
        checkState();
    });

    // We observe body for childList (add/remove) and attributes (style display none)
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });

    console.log('[AuthHelper] Setup Auth Observer Complete.');
}
