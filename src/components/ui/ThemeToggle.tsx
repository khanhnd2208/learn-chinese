'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';

export default function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => setMounted(true), 0);
		return () => window.clearTimeout(timer);
	}, []);

	if (!mounted) {
		return (
			<button type="button" className="text-accent opacity-80" aria-label="Chế độ tối">
				<MaterialIcon name="dark_mode" />
			</button>
		);
	}

	const isDark = theme === 'dark';

	return (
		<button
			type="button"
			onClick={() => setTheme(isDark ? 'light' : 'dark')}
			className="text-accent opacity-80 transition-opacity hover:opacity-100 dark:text-accent-foreground"
			aria-label={isDark ? 'Bật chế độ sáng' : 'Bật chế độ tối'}
		>
			<MaterialIcon name={isDark ? 'light_mode' : 'dark_mode'} />
		</button>
	);
}
