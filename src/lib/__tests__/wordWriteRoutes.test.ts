import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/apiAuth', () => ({ getApiUser: vi.fn() }));
vi.mock('@/services/chinese/cnContentService', () => ({
	getWordCard: vi.fn(),
	updateWordFields: vi.fn(),
}));
vi.mock('@/services/chinese/cnSetService', () => ({
	moveItemToSet: vi.fn(),
	removeItemFromSet: vi.fn(),
	removeItemsFromSet: vi.fn(),
	resolveSetItemWithWordData: vi.fn(),
}));
vi.mock('@/services/chinese/cnSrsEnrollmentService', () => ({
	previewRemoveWordFromSet: vi.fn(),
}));

import { getApiUser } from '@/lib/apiAuth';
import { updateWordFields } from '@/services/chinese/cnContentService';
import { resolveSetItemWithWordData } from '@/services/chinese/cnSetService';
import { PATCH as patchWord } from '@/app/api/words/[id]/route';
import { PATCH as patchSetItem } from '@/app/api/sets/[id]/items/route';

const mockUser = vi.mocked(getApiUser);

function jsonRequest(url: string, body: unknown): NextRequest {
	return new Request(url, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}) as NextRequest;
}

const learner = { id: 'u1', email: 'l@example.com', name: 'L', role: 'student' } as const;
const admin = { id: 'a1', email: 'a@example.com', name: 'A', role: 'admin' } as const;

beforeEach(() => {
	mockUser.mockReset();
	vi.mocked(updateWordFields).mockReset();
	vi.mocked(resolveSetItemWithWordData).mockReset();
});

describe('only admins can change words', () => {
	it('PATCH /api/words/[id] refuses a learner and writes nothing', async () => {
		mockUser.mockResolvedValue(learner);
		const res = await patchWord(
			jsonRequest('http://localhost/api/words/w1', { meaningVi: 'x' }),
			{ params: Promise.resolve({ id: 'w1' }) },
		);
		expect(res.status).toBe(403);
		expect(updateWordFields).not.toHaveBeenCalled();
	});

	it('PATCH /api/words/[id] lets an admin edit the shared word', async () => {
		mockUser.mockResolvedValue(admin);
		vi.mocked(updateWordFields).mockResolvedValue({ id: 'w1' } as never);
		const res = await patchWord(
			jsonRequest('http://localhost/api/words/w1', { meaningVi: 'x' }),
			{ params: Promise.resolve({ id: 'w1' }) },
		);
		expect(res.status).toBe(200);
		expect(updateWordFields).toHaveBeenCalledWith('w1', { meaningVi: 'x' });
	});

	it('PATCH /api/sets/[id]/items refuses a learner who tries to fill in a new word', async () => {
		mockUser.mockResolvedValue(learner);
		const res = await patchSetItem(
			jsonRequest('http://localhost/api/sets/s1/items', {
				itemId: 'i1',
				wordFields: { pinyin: 'p', meaningVi: 'm' },
			}),
			{ params: Promise.resolve({ id: 's1' }) },
		);
		expect(res.status).toBe(403);
		expect(resolveSetItemWithWordData).not.toHaveBeenCalled();
	});

	it('PATCH /api/sets/[id]/items lets an admin fill in a new word', async () => {
		mockUser.mockResolvedValue(admin);
		vi.mocked(resolveSetItemWithWordData).mockResolvedValue({ id: 's1' } as never);
		const res = await patchSetItem(
			jsonRequest('http://localhost/api/sets/s1/items', {
				itemId: 'i1',
				wordFields: { pinyin: 'p', meaningVi: 'm' },
			}),
			{ params: Promise.resolve({ id: 's1' }) },
		);
		expect(res.status).toBe(200);
		expect(resolveSetItemWithWordData).toHaveBeenCalledTimes(1);
	});
});
