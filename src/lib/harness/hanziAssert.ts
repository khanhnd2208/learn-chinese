/** Lightweight assertions for offline harness (no Vitest dependency). */

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
	if (actual !== expected) {
		throw new Error(message ?? `Expected ${String(expected)}, got ${String(actual)}`);
	}
}

export function assertNotEqual<T>(actual: T, expected: T, message?: string): void {
	if (actual === expected) {
		throw new Error(message ?? `Expected value not to equal ${String(expected)}`);
	}
}

export function assertTruthy(value: unknown, message?: string): asserts value {
	if (!value) {
		throw new Error(message ?? 'Expected truthy value');
	}
}

export function assertContains(haystack: string, needle: string, message?: string): void {
	if (!haystack.includes(needle)) {
		throw new Error(message ?? `Expected string to contain "${needle}"`);
	}
}

export function assertNotMatch(haystack: string, pattern: RegExp, message?: string): void {
	if (pattern.test(haystack)) {
		throw new Error(message ?? `Expected string not to match ${pattern}`);
	}
}

export function assertGreaterThan(actual: number, expected: number, message?: string): void {
	if (!(actual > expected)) {
		throw new Error(message ?? `Expected ${actual} > ${expected}`);
	}
}

export function assertArrayEqual<T>(actual: T[], expected: T[], message?: string): void {
	assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}
