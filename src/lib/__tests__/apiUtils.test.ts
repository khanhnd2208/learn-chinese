import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextResponse, type NextRequest } from 'next/server';

vi.mock('@/lib/apiAuth', () => ({
	getApiUser: vi.fn(),
}));

import { getApiUser } from '@/lib/apiAuth';
import { withAdmin } from '@/lib/apiUtils';

const mockGetApiUser = vi.mocked(getApiUser);

beforeEach(() => {
	mockGetApiUser.mockReset();
});

describe('withAdmin', () => {
	it('rejects normal users before the admin handler runs', async () => {
		const handler = vi.fn(async () => NextResponse.json({ ok: true }));
		mockGetApiUser.mockResolvedValue({
			id: 'user-1',
			email: 'user@example.com',
			name: 'User',
			role: 'student',
		});

		const response = await withAdmin(handler)(new Request('http://localhost/api/admin') as NextRequest);
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body).toEqual({ ok: false, error: 'Forbidden' });
		expect(handler).not.toHaveBeenCalled();
	});
});
