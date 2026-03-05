(function () {
    'use strict';

    const BUTTON_ID = 'ai-sp-claude-temp-hamburger';
    const STYLE_ID = 'ai-sp-claude-temp-hamburger-style';
    const EMBED_SIGNAL_TYPES = new Set(['AI_SIDE_PANEL_FOCUS_SEARCH', 'AI_SP_EMBEDDED']);
    const EMBED_SIGNAL_TIMEOUT_MS = 20000;
    const EXTENSION_ORIGIN = getExtensionOrigin();
    const EMBEDDED_FRAME_NAME_PREFIX = 'ai-sp-embed';
    const SEARCH_SELECTORS = [
        'a[aria-label="Search"][data-dd-action-name="sidebar-nav-item"]',
        'a[aria-label="Search"]'
    ];
    const OBSERVER_TIMEOUT_MS = 200;
    let hasInitialized = false;
    let resilienceObserver = null;
    let resilienceTimeoutId = null;

    const LOG_PREFIX = '[AI Side Panel][Claude Hamburger]';

    const safeInfo = (...args) => {
        try {
            console.info(LOG_PREFIX, ...args);
        } catch (_) {
            // no-op
        }
    };

    function getExtensionOrigin() {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                return `chrome-extension://${chrome.runtime.id}`;
            }
        } catch (_) {
            // no-op
        }
        return 'chrome-extension://';
    }

    if (window.top === window.self) {
        safeInfo('skip: top-level', { href: window.location.href });
        return;
    }

    if (isEmbeddedInExtensionSidePanel()) {
        safeInfo('init: embedded', {
            href: window.location.href,
            frameName: window.name,
            referrer: document.referrer
        });
        initialize();
    } else {
        safeInfo('init: not embedded (waiting)', {
            href: window.location.href,
            frameName: window.name,
            referrer: document.referrer
        });
        waitForExtensionEmbedSignal();
    }

    function initialize() {
        if (hasInitialized) {
            return;
        }
        hasInitialized = true;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mountButton, { once: true });
        } else {
            mountButton();
        }
    }

    function isEmbeddedInExtensionSidePanel() {
        if (typeof window.name === 'string' && window.name.startsWith(EMBEDDED_FRAME_NAME_PREFIX)) {
            return true;
        }

        return hasExtensionAncestorOrigin() || document.referrer.startsWith(EXTENSION_ORIGIN);
    }

    function hasExtensionAncestorOrigin() {
        try {
            const { ancestorOrigins } = window.location;
            if (!ancestorOrigins || typeof ancestorOrigins.length !== 'number') {
                return false;
            }

            for (let i = 0; i < ancestorOrigins.length; i += 1) {
                if (String(ancestorOrigins[i]).startsWith(EXTENSION_ORIGIN)) {
                    return true;
                }
            }
        } catch (_) {
            return false;
        }

        return false;
    }

    function waitForExtensionEmbedSignal() {
        let settled = false;
        let timeoutId = null;

        const onMessage = (event) => {
            if (!isValidExtensionEmbedSignal(event)) {
                return;
            }

            cleanup();
            initialize();
        };

        const cleanup = () => {
            if (settled) {
                return;
            }

            settled = true;
            window.removeEventListener('message', onMessage);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };

        window.addEventListener('message', onMessage);
        timeoutId = setTimeout(cleanup, EMBED_SIGNAL_TIMEOUT_MS);
    }

    function isValidExtensionEmbedSignal(event) {
        const type = event?.data?.type;
        if (!EMBED_SIGNAL_TYPES.has(type)) {
            return false;
        }

        const origin = event?.origin;
        if (typeof origin !== 'string') {
            return false;
        }

        if (origin === 'null' && typeof window.name === 'string' && window.name.startsWith(EMBEDDED_FRAME_NAME_PREFIX) && event.source === window.parent) {
            return true;
        }

        if (EXTENSION_ORIGIN === 'chrome-extension://') {
            return origin.startsWith('chrome-extension://');
        }

        return origin === EXTENSION_ORIGIN;
    }

    function mountButton() {
        if (!document.body) {
            return;
        }

        injectStyle();

        if (document.getElementById(BUTTON_ID)) {
            return;
        }

        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.type = 'button';
        button.setAttribute('aria-label', 'Search');
        button.title = 'Search';
        button.innerHTML = [
            '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">',
            '<path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
            '</svg>'
        ].join('');
        button.addEventListener('click', () => {
            triggerClaudeSearch();
        });

        document.body.appendChild(button);
        ensureButtonPersists();
        safeInfo('mounted');
    }

    function ensureButtonPersists() {
        if (resilienceObserver) {
            return;
        }

        const root = document.documentElement;
        if (!root) {
            return;
        }

        resilienceObserver = new MutationObserver(() => {
            if (!document.getElementById(BUTTON_ID) && document.body) {
                mountButton();
            }
        });

        resilienceObserver.observe(root, { childList: true, subtree: true });

        resilienceTimeoutId = setTimeout(() => {
            try {
                resilienceObserver?.disconnect();
            } catch (_) {
                // no-op
            }
            resilienceObserver = null;
            resilienceTimeoutId = null;
        }, 15000);
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
#${BUTTON_ID} {
    position: fixed;
    top: calc(10px + env(safe-area-inset-top));
    left: calc(10px + env(safe-area-inset-left));
    z-index: 2147483647;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(20,20,24,0.72);
    border: 1px solid rgba(255,255,255,0.16);
    color: #f0f0f0;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    cursor: pointer;
}

#${BUTTON_ID}:hover {
    background: rgba(28,28,34,0.82);
    border-color: rgba(255,255,255,0.28);
}

#${BUTTON_ID}:focus-visible {
    outline: 2px solid rgba(240,240,240,0.85);
    outline-offset: 2px;
}
`;
        (document.head || document.documentElement).appendChild(style);
    }

    async function triggerClaudeSearch() {
        if (clickClaudeSearchLink()) {
            return;
        }

        if (await waitAndClickClaudeSearchLink()) {
            return;
        }

        dispatchSearchShortcutFallback();
    }

    function clickClaudeSearchLink() {
        for (const selector of SEARCH_SELECTORS) {
            const searchLink = document.querySelector(selector);
            if (searchLink) {
                searchLink.click();
                return true;
            }
        }
        return false;
    }

    function waitAndClickClaudeSearchLink() {
        return new Promise((resolve) => {
            const root = document.documentElement || document.body;
            if (!root) {
                resolve(false);
                return;
            }

            let settled = false;
            const observer = new MutationObserver(() => {
                if (clickClaudeSearchLink()) {
                    finish(true);
                }
            });

            const timeoutId = setTimeout(() => {
                finish(false);
            }, OBSERVER_TIMEOUT_MS);

            const finish = (didClick) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeoutId);
                observer.disconnect();
                resolve(didClick);
            };

            observer.observe(root, { childList: true, subtree: true });

            if (clickClaudeSearchLink()) {
                finish(true);
            }
        });
    }

    function dispatchSearchShortcutFallback() {
        dispatchKeydown({ ctrlKey: true, metaKey: false });
        dispatchKeydown({ ctrlKey: false, metaKey: true });
    }

    function dispatchKeydown(modifierState) {
        const eventInit = {
            key: 'k',
            code: 'KeyK',
            ctrlKey: modifierState.ctrlKey,
            metaKey: modifierState.metaKey,
            bubbles: true,
            cancelable: true
        };

        try {
            document.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        } catch (_) {
            // no-op
        }

        try {
            window.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        } catch (_) {
            // no-op
        }
    }
})();
