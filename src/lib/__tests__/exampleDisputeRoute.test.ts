import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/apiAuth', () => ({ getApiUser: vi.fn() }));
vi.mock('@/services/chinese/cnDisputeService', () => ({
	listPendingDisputeGroups: vi.fn(),
	resolveDisputeGroup: vi.fn(),
}));

import { getApiUser } from '@/lib/apiAuth';
import { resolveDisputeGroup } from '@/services/chinese/cnDisputeService';
import { POST } from '@/app/api/admin/example-disputes/route';

const mockUser = vi.mocked(getApiUser);

beforeEach(() => {
	mockUser.mockReset();
	vi.mocked(resolveDisputeGroup).mockReset();
});

describe('POST /api/admin/example-disputes', () => {
	it('returns 403 for a learner and does not resolve the group', async () => {
		mockUser.mockResolvedValue({
			id: 'u1',
			email: 'l@example.com',
			name: 'L',
			role: 'student',
		});
		const res = await POST(new Request('http://localhost/api/admin/example-disputes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ exampleId: 'ex-1', answer: '已', action: 'accept' }),
		}) as NextRequest);
		expect(res.status).toBe(403);
		expect(resolveDisputeGroup).not.toHaveBeenCalled();
	});
});
