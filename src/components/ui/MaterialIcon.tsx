interface Props {
	name: string;
	filled?: boolean;
	className?: string;
	size?: number;
}

export default function MaterialIcon({ name, filled = false, className = '', size }: Props) {
	return (
		<span
			className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}
			style={size ? { fontSize: size } : undefined}
			aria-hidden
		>
			{name}
		</span>
	);
}
