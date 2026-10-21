import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/apiAuth', () => ({ getApiUser: vi.fn() }));
vi.mock('@/services/chinese/cnExampleQualityService', () => ({
	listFlaggedExamples: vi.fn(),
	applyExampleQualityAction: vi.fn(),
}));

import { getApiUser } from '@/lib/apiAuth';
import { applyExampleQualityAction } from '@/services/chinese/cnExampleQualityService';
import { POST } from '@/app/api/admin/example-quality/route';

const mockUser = vi.mocked(getApiUser);

beforeEach(() => {
	mockUser.mockReset();
	vi.mocked(applyExampleQualityAction).mockReset();
});

describe('POST /api/admin/example-quality', () => {
	it('returns 403 for a learner and does not change the sentence', async () => {
		mockUser.mockResolvedValue({
			id: 'u1',
			email: 'l@example.com',
			name: 'L',
			role: 'student',
		});
		const res = await POST(new Request('http://localhost/api/admin/example-quality', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ exampleId: 'ex-1', action: 'retire' }),
		}) as NextRequest);
		expect(res.status).toBe(403);
		expect(applyExampleQualityAction).not.toHaveBeenCalled();
	});
});
