import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
	CN_MAX_BULK_ITEM_IDS,
	CN_MAX_EXCLUDE_IDS,
	CN_MAX_INFERNO_FETCH_LIMIT,
	CN_MAX_PRACTICE_COUNT,
	CN_MAX_REVIEW_FETCH_LIMIT,
} from '@/config/constants';

vi.mock('@/lib/apiAuth', () => ({
	getApiUser: vi.fn(),
}));

vi.mock('@/services/chinese/cnPracticeService', () => ({
	buildPracticeSession: vi.fn(),
	buildReviewQuestions: vi.fn(),
}));

vi.mock('@/services/chinese/cnSrsService', () => ({
	countDueToday: vi.fn(),
}));

vi.mock('@/services/chinese/cnInfernoService', () => ({
	buildInfernoSession: vi.fn(),
}));

vi.mock('@/services/chinese/cnSetService', () => ({
	addTermsToSet: vi.fn(),
	moveItemToSet: vi.fn(),
	removeItemFromSet: vi.fn(),
	removeItemsFromSet: vi.fn(),
	resolveSetItemWithWordData: vi.fn(),
}));

vi.mock('@/services/chinese/cnSrsEnrollmentService', () => ({
	previewRemoveWordFromSet: vi.fn(),
}));

import { getApiUser } from '@/lib/apiAuth';
import { buildInfernoSession } from '@/services/chinese/cnInfernoService';
import { buildPracticeSession, buildReviewQuestions } from '@/services/chinese/cnPracticeService';
import { countDueToday } from '@/services/chinese/cnSrsService';
import { removeItemsFromSet } from '@/services/chinese/cnSetService';
import { GET as infernoGET } from '@/app/api/inferno/route';
import { GET as practiceGET } from '@/app/api/practice/[setId]/route';
import { GET as reviewGET } from '@/app/api/review/route';
import { DELETE as setItemsDELETE } from '@/app/api/sets/[id]/items/route';

const mockGetApiUser = vi.mocked(getApiUser);

beforeEach(() => {
	vi.clearAllMocks();
	mockGetApiUser.mockResolvedValue({
		id: 'user-1',
		email: 'user@example.com',
		name: 'User',
		role: 'student',
	});
});

describe('API route request limits', () => {
	it('rejects oversized practice count before building a session', async () => {
		const request = new NextRequest(`http://localhost/api/practice/set-1?count=${CN_MAX_PRACTICE_COUNT + 1}`);

		const response = await practiceGET(request, { params: Promise.resolve({ setId: 'set-1' }) });

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			ok: false,
			error: `count phải là số nguyên 1–${CN_MAX_PRACTICE_COUNT}`,
		});
		expect(buildPracticeSession).not.toHaveBeenCalled();
	});

	it('rejects oversized review limit and exclude lists before doing review work', async () => {
		const excludeIds = Array.from({ length: CN_MAX_EXCLUDE_IDS + 1 }, (_, i) => `q-${i}`).join(',');
		const request = new NextRequest(
			`http://localhost/api/review?limit=${CN_MAX_REVIEW_FETCH_LIMIT}&excludeIds=${excludeIds}`,
		);

		const response = await reviewGET(request);

		expect(response.status).toBe(400);
		expect(buildReviewQuestions).not.toHaveBeenCalled();
		expect(countDueToday).not.toHaveBeenCalled();
	});

	it('rejects oversized inferno limit before building a session', async () => {
		const request = new NextRequest(`http://localhost/api/inferno?limit=${CN_MAX_INFERNO_FETCH_LIMIT + 1}`);

		const response = await infernoGET(request);

		expect(response.status).toBe(400);
		expect(buildInfernoSession).not.toHaveBeenCalled();
	});

	it('rejects oversized bulk item delete payload before mutating a set', async () => {
		mockGetApiUser.mockResolvedValueOnce({
			id: 'admin-1',
			email: 'admin@example.com',
			name: 'Admin',
			role: 'admin',
		});
		const itemIds = Array.from({ length: CN_MAX_BULK_ITEM_IDS + 1 }, (_, i) => `item-${i}`);
		const request = new NextRequest('http://localhost/api/sets/set-1/items', {
			method: 'DELETE',
			body: JSON.stringify({ itemIds }),
		});

		const response = await setItemsDELETE(request, { params: Promise.resolve({ id: 'set-1' }) });

		expect(response.status).toBe(400);
		expect(removeItemsFromSet).not.toHaveBeenCalled();
	});
});
