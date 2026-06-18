import { describe, expect, it } from 'vitest';
import { detectInAppBrowserFromUserAgent } from '@/lib/detectInAppBrowser';

describe('detectInAppBrowserFromUserAgent', () => {
	it('detects common in-app browsers', () => {
		expect(detectInAppBrowserFromUserAgent('Mozilla/5.0 FBAN/FBIOS Instagram 123')).toBe('in-app-webview');
		expect(detectInAppBrowserFromUserAgent('Mozilla/5.0 Zalo iOS')).toBe('in-app-webview');
	});

	it('allows Safari and Chrome on iOS', () => {
		const safari =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
		const chrome =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1';

		expect(detectInAppBrowserFromUserAgent(safari)).toBeNull();
		expect(detectInAppBrowserFromUserAgent(chrome)).toBeNull();
	});

	it('detects Android WebView', () => {
		const webView =
			'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36; wv)';
		expect(detectInAppBrowserFromUserAgent(webView)).toBe('in-app-webview');
	});
});
