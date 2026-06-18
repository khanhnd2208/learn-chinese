import type { CnHanziDTO } from '@/types/chinese';

interface Props {
	chars: Array<CnHanziDTO & { position?: number }>;
}

export default function CharBreakdown({ chars }: Props) {
	if (!chars.length) {
		return <p className="text-sm text-muted">Chưa có dữ liệu phân tích chữ.</p>;
	}

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{chars.map((c) => (
				<div key={`${c.char}-${c.position ?? 0}`} className="card-paper p-6">
					<div className="flex items-start gap-6 border-b border-border pb-4">
						<div className="flex h-24 w-24 items-center justify-center rounded-lg border border-border bg-background">
							<span className="hanzi-display text-5xl font-black text-foreground">{c.char}</span>
						</div>
						<div className="flex flex-col justify-center">
							<span className="text-lg font-bold text-accent">{c.pinyin}</span>
							{c.hanViet && (
								<span className="mt-1 text-sm text-foreground-secondary">Hán Việt: {c.hanViet}</span>
							)}
							<span className="mt-2 text-sm font-semibold text-foreground">{c.meaningVi}</span>
						</div>
					</div>

					<div className="mt-4 space-y-3">
						{c.radical && (
							<div className="grid grid-cols-[100px_1fr] items-center gap-2">
								<span className="label-caps">Bộ thủ</span>
								<div className="flex items-center gap-2">
									<span className="hanzi-lg rounded border border-border bg-accent-subtle px-2 py-1 text-lg text-accent">
										{c.radical}
									</span>
								</div>
							</div>
						)}
						{c.components.length > 0 && (
							<div className="grid grid-cols-[100px_1fr] items-start gap-2">
								<span className="label-caps mt-2">Thành phần</span>
								<div className="flex flex-wrap gap-2">
									{c.components.map((comp) => (
										<div key={comp} className="flex items-center gap-2 rounded border border-border bg-surface-dim px-2 py-1">
											<span className="hanzi-lg text-lg">{comp}</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{c.mnemonicVi && (
						<div className="mt-4 rounded-lg border border-border bg-background p-4">
							<span className="label-caps mb-1 block">Gợi ý nhớ</span>
							<p className="text-sm text-foreground-secondary">{c.mnemonicVi}</p>
						</div>
					)}
				</div>
			))}
		</div>
	);
}
