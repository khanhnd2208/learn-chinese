import fs from 'fs';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { audioContentType, englishAudioRoot, resolveAudioFile } from '@/lib/english/audioPath';

export async function audioFileExists(relativeName: string): Promise<boolean> {
	const root = englishAudioRoot();
	if (!root) return false;
	const full = resolveAudioFile(root, relativeName);
	if (!full) return false;
	try {
		await fs.promises.access(full, fs.constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

async function readInsideRoot(relativeName: string): Promise<{ bytes: Buffer; type: string } | null> {
	const root = englishAudioRoot();
	if (!root || !relativeName.trim()) return null;
	const full = resolveAudioFile(root, relativeName);
	if (!full) return null;
	try {
		const bytes = await fs.promises.readFile(full);
		return { bytes, type: audioContentType(full) };
	} catch {
		return null;
	}
}

export async function readEnglishAudio(query: {
	questionId?: string | null;
	senseId?: string | null;
	patternExampleId?: string | null;
	exampleId?: string | null;
}): Promise<{ bytes: Buffer; type: string }> {
	if (query.questionId) {
		const question = await prisma.enQuestion.findFirst({
			where: { id: query.questionId, status: 'published' },
			select: { audioPath: true },
		});
		const file = question ? await readInsideRoot(question.audioPath) : null;
		if (!file) throw new AppError('Chưa có audio cho câu này', 404);
		return file;
	}
	if (query.senseId) {
		const sense = await prisma.enSense.findFirst({
			where: { id: query.senseId, status: 'published' },
			include: { word: { select: { audioPath: true } } },
		});
		const file = sense ? await readInsideRoot(sense.word.audioPath) : null;
		if (!file) throw new AppError('Chưa có audio cho từ này', 404);
		return file;
	}
	if (query.patternExampleId) {
		const example = await prisma.enPatternExample.findFirst({
			where: { id: query.patternExampleId, status: 'published' },
			select: { audioPath: true },
		});
		const file = example ? await readInsideRoot(example.audioPath) : null;
		if (!file) throw new AppError('Chưa có audio cho mẫu câu', 404);
		return file;
	}
	if (query.exampleId) {
		const example = await prisma.enExample.findFirst({
			where: { id: query.exampleId, status: 'published' },
			select: { audioPath: true },
		});
		const file = example ? await readInsideRoot(example.audioPath) : null;
		if (!file) throw new AppError('Chưa có audio cho câu ví dụ', 404);
		return file;
	}
	throw new AppError('Thiếu nội dung audio', 400);
}
