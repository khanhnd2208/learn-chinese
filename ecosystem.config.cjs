/** PM2 ecosystem — Hanzi AI requires single fork process (in-memory rate limits). */
module.exports = {
	apps: [
		{
			name: 'learn-chinese',
			script: 'npm',
			args: 'start',
			cwd: __dirname + '/..',
			instances: 1,
			exec_mode: 'fork',
			env: { NODE_ENV: 'production', PORT: 3001 },
		},
	],
};
