export type InAppBrowserKind = 'ios-standalone' | 'in-app-webview';

const IN_APP_UA_PATTERNS = [
	/FBAN|FBAV/i,
	/Instagram/i,
	/Line\//i,
	/Twitter/i,
	/Snapchat/i,
	/TikTok/i,
	/LinkedInApp/i,
	/WhatsApp/i,
	/Zalo/i,
	/MicroMessenger/i,
];

/** Detect embedded / in-app browsers that Google OAuth blocks (403 disallowed_useragent). */
export function detectInAppBrowserFromUserAgent(userAgent: string): InAppBrowserKind | null {
	if (IN_APP_UA_PATTERNS.some((pattern) => pattern.test(userAgent))) {
		return 'in-app-webview';
	}

	if (/Android/.test(userAgent) && /;\s*wv\)/.test(userAgent)) {
		return 'in-app-webview';
	}

	if (
		/iPhone|iPad|iPod/.test(userAgent) &&
		/AppleWebKit/.test(userAgent) &&
		!/Safari|CriOS|FxiOS|EdgiOS/.test(userAgent)
	) {
		return 'in-app-webview';
	}

	return null;
}

export function isStandaloneDisplayMode(): boolean {
	if (typeof window === 'undefined') return false;

	const nav = navigator as Navigator & { standalone?: boolean };
	if (nav.standalone) return true;

	return window.matchMedia('(display-mode: standalone)').matches;
}

export function detectInAppBrowser(): InAppBrowserKind | null {
	if (typeof window === 'undefined') return null;
	if (isStandaloneDisplayMode()) return 'ios-standalone';
	return detectInAppBrowserFromUserAgent(navigator.userAgent);
}

/** Best-effort deep link to open the URL in the system browser (Chrome on Android). */
export function getExternalBrowserUrl(pageUrl: string): string | null {
	if (typeof window === 'undefined') return null;

	const withoutScheme = pageUrl.replace(/^https?:\/\//, '');

	if (/Android/.test(navigator.userAgent)) {
		const fallback = encodeURIComponent(pageUrl);
		return `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
	}

	if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
		return `googlechromes://${withoutScheme}`;
	}

	return null;
}
