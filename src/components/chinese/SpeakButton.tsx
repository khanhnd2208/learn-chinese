"use client";

import { useSpeech } from '@/lib/chinese/useSpeech';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface Props {
	text: string;
	label?: string;
	className?: string;
	iconOnly?: boolean;
}

export default function SpeakButton({ text, label = 'Nghe', className = '', iconOnly = false }: Props) {
	const { supported, speaking, speak } = useSpeech();

	if (!supported) {
		return (
			<span className={`text-xs text-muted ${className}`}>
				Trình duyệt không hỗ trợ phát âm
			</span>
		);
	}

	if (iconOnly) {
		return (
			<button
				type="button"
				onClick={() => speak(text)}
				disabled={speaking}
				aria-label="Phát âm"
				className={`flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-accent-subtle text-accent transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 ${className}`}
			>
				<MaterialIcon name="volume_up" size={20} />
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={() => speak(text)}
			disabled={speaking}
			className={`inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors hover:border-accent hover:text-accent disabled:opacity-50 ${className}`}
		>
			<MaterialIcon name="volume_up" size={16} />
			{speaking ? 'Đang phát...' : label}
		</button>
	);
}
