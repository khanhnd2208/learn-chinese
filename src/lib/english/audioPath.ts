import path from 'path';

/** Audio lives outside the release directory. `ENGLISH_AUDIO_ROOT` points at that shared folder. */
export function englishAudioRoot(): string | null {
	const root = process.env.ENGLISH_AUDIO_ROOT?.trim();
	return root ? root : null;
}

/** Resolve a stored file name inside the audio root. Rejects absolute paths and `..`. */
export function resolveAudioFile(root: string, relativeName: string): string | null {
	const name = relativeName.trim();
	if (!name || name.includes('..') || path.isAbsolute(name)) return null;
	if (name.includes('\0')) return null;
	const rootResolved = path.resolve(root);
	const full = path.resolve(rootResolved, name);
	if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) return null;
	return full;
}

export function audioContentType(fileName: string): string {
	const ext = path.extname(fileName).toLowerCase();
	if (ext === '.wav') return 'audio/wav';
	if (ext === '.ogg') return 'audio/ogg';
	if (ext === '.m4a') return 'audio/mp4';
	return 'audio/mpeg';
}
