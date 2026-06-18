/**
 * Known application error — safe to expose message to clients.
 */
export class AppError extends Error {
	constructor(
		message: string,
		public readonly status: number = 400,
	) {
		super(message);
		this.name = 'AppError';
	}
}
