"use client";

import { useState } from 'react';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SetSrsToggle from '@/app/(app)/sets/SetSrsToggle';
import { PRACTICE_MODES } from '@/lib/chinese/questionLabels';
import type { CnWordSetDTO } from '@/types/chinese';

interface Props {
	set: CnWordSetDTO;
}

const PRIMARY_MODES = ['smart_mixed', 'listening'] as const;
const OTHER_MODES = PRACTICE_MODES.filter((m) => !PRIMARY_MODES.includes(m.mode as typeof PRIMARY_MODES[number]));

export default function SetStudyPanel({ set }: Props) {
	const [showOtherModes, setShowOtherModes] = useState(false);

	return (
		<div className="space-y-6">
			<section>
				<h1 className="text-3xl font-black text-foreground">{set.title}</h1>
				{set.description && <p className="mt-1 text-sm text-muted">{set.description}</p>}
				<p className="mt-2 text-sm text-muted">
					{set.itemCount} từ
					{set.srsActive && ` · ${set.dueCount} cần ôn · ${set.weakCount} cần chú ý`}
				</p>

				<div className="mt-4">
					<SetSrsToggle setId={set.id} srsActive={set.srsActive} title={set.title} />
				</div>

				{set.srsActive && set.dueCount > 0 && (
					<div className="mt-3">
						<Link href="/review" className="btn-primary w-full justify-center sm:w-auto">
							<MaterialIcon name="school" size={16} />
							Ôn tập SRS ({set.dueCount} mục)
						</Link>
					</div>
				)}

				<p className="mt-3 text-xs text-muted">
					Luyện tập trong bộ này không ảnh hưởng tiến độ SRS.
				</p>

				<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
					<Link
						href={`/practice/${set.id}?mode=integrated_recall`}
						className="btn-primary w-full justify-center sm:w-auto"
					>
						<MaterialIcon name="hub" size={16} />
						Kiểm tra toàn diện
					</Link>
				</div>

				<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap md:hidden">
					<Link
						href={`/practice/${set.id}?mode=smart_mixed`}
						className="btn-primary w-full justify-center sm:w-auto"
					>
						<MaterialIcon name="auto_awesome" size={16} />
						Luyện tập thông minh
					</Link>
					<Link
						href={`/practice/${set.id}?mode=listening`}
						className="btn-secondary w-full justify-center sm:w-auto"
					>
						<MaterialIcon name="hearing" size={16} />
						Luyện nghe
					</Link>
				</div>

				<div className="mt-3 md:hidden">
					<button
						type="button"
						onClick={() => setShowOtherModes(!showOtherModes)}
						className="flex items-center gap-1 text-sm font-bold text-foreground-secondary transition-colors hover:text-accent"
					>
						<MaterialIcon name={showOtherModes ? 'expand_less' : 'expand_more'} size={18} />
						Chế độ khác
					</button>
					{showOtherModes && (
						<div className="mt-2 flex flex-wrap gap-2">
							{OTHER_MODES.map((m) => (
								<Link
									key={m.mode}
									href={`/practice/${set.id}?mode=${m.mode}`}
									className="btn-secondary"
								>
									<MaterialIcon name={m.icon} size={16} />
									{m.label}
								</Link>
							))}
						</div>
					)}
				</div>

				{/* Desktop: show all modes inline */}
				<div className="mt-4 hidden flex-wrap gap-2 md:flex">
					<Link
						href={`/practice/${set.id}?mode=integrated_recall`}
						className="btn-primary"
					>
						<MaterialIcon name="hub" size={16} />
						Kiểm tra toàn diện
					</Link>
					{PRACTICE_MODES.map((m) => (
						<Link
							key={m.mode}
							href={`/practice/${set.id}?mode=${m.mode}`}
							className={m.mode === 'smart_mixed' ? 'btn-primary' : 'btn-secondary'}
						>
							<MaterialIcon name={m.icon} size={16} />
							{m.label}
						</Link>
					))}
				</div>
			</section>

			<section>
				<h2 className="text-lg font-extrabold text-foreground">Danh sách từ</h2>
				<div className="mt-3 grid gap-3">
					{set.items.map((item) => (
						<div key={item.id} className="card-paper p-4">
							{item.wordId ? (
								<Link
									href={`/words/${item.wordId}?setId=${set.id}`}
									className="hanzi-lg text-xl font-black transition-colors hover:text-accent"
								>
									{item.rawTerm}
								</Link>
							) : (
								<p className="hanzi-lg text-xl font-black text-muted">{item.rawTerm}</p>
							)}
							{item.word ? (
								<p className="text-sm text-foreground-secondary">{item.word.pinyin} · {item.word.meaningVi}</p>
							) : (
								<p className="text-xs text-warning">Chờ bổ sung dữ liệu</p>
							)}
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
