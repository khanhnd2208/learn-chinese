import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/apiAuth', () => ({ getApiUser: vi.fn() }));
vi.mock('@/services/chinese/cnSetService', () => ({
	createUserSet: vi.fn(),
	createSetFromHsk: vi.fn(),
	listUserSets: vi.fn(),
	duplicateUserSet: vi.fn(),
}));
vi.mock('@/services/chinese/cnEnrollmentService', () => ({
	listEnrolledSets: vi.fn(),
	listExploreSets: vi.fn(),
	enrollInSet: vi.fn(),
	unenrollFromSet: vi.fn(),
	setEnrollmentSrs: vi.fn(),
}));
vi.mock('@/services/chinese/cnExcelService', () => ({
	importUserWorkbook: vi.fn(),
	previewUserWorkbook: vi.fn(),
	importPastedTuVung: vi.fn(),
	previewPastedTuVung: vi.fn(),
}));

import { getApiUser } from '@/lib/apiAuth';
import { enrollInSet, listEnrolledSets, unenrollFromSet } from '@/services/chinese/cnEnrollmentService';
import { listUserSets, createUserSet } from '@/services/chinese/cnSetService';
import { previewUserWorkbook } from '@/services/chinese/cnExcelService';
import { POST as createSet, GET as listSets } from '@/app/api/sets/route';
import { POST as importSet } from '@/app/api/sets/import/route';
import { POST as smartImport } from '@/app/api/sets/import/smart/route';
import { POST as duplicateSet } from '@/app/api/sets/[id]/duplicate/route';
import { POST as duplicateShared } from '@/app/api/sets/shared/[id]/duplicate/route';
import { POST as followSet, DELETE as unfollowSet } from '@/app/api/library/[setId]/route';

const mockUser = vi.mocked(getApiUser);
const learner = { id: 'learner', email: 'l@example.com', name: 'L', role: 'student' } as const;
const admin = { id: 'admin', email: 'a@example.com', name: 'A', role: 'admin' } as const;

function request(url: string, method = 'GET', body?: unknown): NextRequest {
	return new Request(url, {
		method,
		headers: body ? { 'Content-Type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	}) as NextRequest;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('learner set mutations are forbidden', () => {
	it('POST /api/sets returns 403', async () => {
		mockUser.mockResolvedValue(learner);
		const res = await createSet(request('http://localhost/api/sets', 'POST', { title: 'Mới', terms: ['你'] }));
		expect(res.status).toBe(403);
		expect(createUserSet).not.toHaveBeenCalled();
	});

	it('POST /api/sets/import returns 403', async () => {
		mockUser.mockResolvedValue(learner);
		const res = await importSet(request('http://localhost/api/sets/import', 'POST'));
		expect(res.status).toBe(403);
		expect(previewUserWorkbook).not.toHaveBeenCalled();
	});

	it('POST /api/sets/import/smart returns 403', async () => {
		mockUser.mockResolvedValue(learner);
		const res = await smartImport(request('http://localhost/api/sets/import/smart', 'POST', {
			action: 'preview',
			text: '你',
		}));
		expect(res.status).toBe(403);
	});

	it('POST /api/sets/[id]/duplicate returns 403', async () => {
		mockUser.mockResolvedValue(learner);
		const res = await duplicateSet(
			request('http://localhost/api/sets/s1/duplicate', 'POST'),
			{ params: Promise.resolve({ id: 's1' }) },
		);
		expect(res.status).toBe(403);
	});

	it('POST /api/sets/shared/[id]/duplicate returns 410', async () => {
		mockUser.mockResolvedValue(learner);
		const res = await duplicateShared(
			request('http://localhost/api/sets/shared/s1/duplicate', 'POST'),
			{ params: Promise.resolve({ id: 's1' }) },
		);
		expect(res.status).toBe(410);
	});
});

describe('set lists', () => {
	it('GET /api/sets returns the sets a learner follows', async () => {
		mockUser.mockResolvedValue(learner);
		vi.mocked(listEnrolledSets).mockResolvedValue([]);
		const res = await listSets(request('http://localhost/api/sets'));
		expect(res.status).toBe(200);
		expect(listEnrolledSets).toHaveBeenCalledWith('learner');
		expect(listUserSets).not.toHaveBeenCalled();
	});

	it('GET /api/sets?scope=admin is admin-only and returns created sets', async () => {
		mockUser.mockResolvedValue(learner);
		const denied = await listSets(request('http://localhost/api/sets?scope=admin'));
		expect(denied.status).toBe(403);

		mockUser.mockResolvedValue(admin);
		vi.mocked(listUserSets).mockResolvedValue([]);
		const allowed = await listSets(request('http://localhost/api/sets?scope=admin'));
		expect(allowed.status).toBe(200);
		expect(listUserSets).toHaveBeenCalledWith('admin');
	});
});

describe('library follow', () => {
	it('unfollow does not ask the service to delete progress', async () => {
		mockUser.mockResolvedValue(learner);
		vi.mocked(unenrollFromSet).mockResolvedValue({ removed: true });
		const res = await unfollowSet(
			request('http://localhost/api/library/s1', 'DELETE'),
			{ params: Promise.resolve({ setId: 's1' }) },
		);
		expect(res.status).toBe(200);
		expect(unenrollFromSet).toHaveBeenCalledWith('learner', 's1');
	});

	it('POST /api/library/[setId] follows the original set', async () => {
		mockUser.mockResolvedValue(learner);
		vi.mocked(enrollInSet).mockResolvedValue({ setId: 's1', srsActive: true });
		const res = await followSet(
			request('http://localhost/api/library/s1', 'POST'),
			{ params: Promise.resolve({ setId: 's1' }) },
		);
		expect(res.status).toBe(201);
		expect(enrollInSet).toHaveBeenCalledWith('learner', 's1');
	});
});
