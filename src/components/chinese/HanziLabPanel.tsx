import MaterialIcon from '@/components/ui/MaterialIcon';
import Link from 'next/link';
import type { CnHanziAnalysisDTO } from '@/types/chinese';
import CharBreakdown from '@/components/chinese/CharBreakdown';
import SpeakButton from '@/components/chinese/SpeakButton';

interface Props {
	analysis: CnHanziAnalysisDTO;
}

export default function HanziLabPanel({ analysis }: Props) {
	const { term, status, word, chars, similarGroup, mnemonicOverall } = analysis;
	const componentKey = similarGroup
		? `phonetic:${similarGroup.id}`
		: chars[0]?.radical
			? `radical:${chars[0].radical}`
			: null;

	return (
		<div className="space-y-6">
			<div className="card-paper p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="hanzi-display text-4xl font-black">{term}</p>
						{word && (
							<>
								<p className="mt-2 text-lg font-bold text-accent">{word.pinyin}</p>
								<p className="text-sm text-muted">{word.hanViet} · {word.meaningVi}</p>
							</>
						)}
					</div>
					<div className="flex flex-col gap-2">
						{(word?.simplified || term) && <SpeakButton text={word?.simplified || term} />}
						{word && (
							<Link href={`/words/${word.id}`} className="btn-secondary text-xs">
								Xem thẻ từ
							</Link>
						)}
					</div>
				</div>

				{status === 'none' && (
					<p className="mt-4 rounded-lg border border-accent/30 bg-accent-subtle p-3 text-sm text-accent">
						Chưa có dữ liệu cho từ/chữ này. Không tự sinh nội dung — có thể lưu vào danh sách chờ bổ sung.
					</p>
				)}
				{status === 'charsOnly' && (
					<p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
						Chưa có nghĩa từ hoàn chỉnh, nhưng có thể phân tích từng chữ bên dưới.
					</p>
				)}
				{mnemonicOverall && (
					<div className="mt-4 rounded-lg border border-border bg-background p-4">
						<span className="label-caps mb-1 block">Gợi ý nhớ tổng thể</span>
						<p className="text-sm text-foreground-secondary">{mnemonicOverall}</p>
					</div>
				)}
			</div>

			<div>
				<h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-foreground">
					<MaterialIcon name="account_tree" className="text-accent" size={20} />
					Phân tích từng chữ
				</h3>
				<CharBreakdown chars={chars} />
			</div>

			{similarGroup && (
				<div className="card-paper p-6">
					<h3 className="label-caps">
						Phân biệt chữ gần giống — nhóm {similarGroup.key}
					</h3>
					{similarGroup.note && <p className="mt-2 text-sm text-foreground-secondary">{similarGroup.note}</p>}
					{componentKey && (
						<p className="mt-3 text-xs text-muted">
							Các từ cùng nhóm thành phần có thể học nhanh hơn khi đã quen bộ thủ/âm gốc.
						</p>
					)}
					<div className="mt-4 grid gap-3 sm:grid-cols-2">
						{similarGroup.hanzi.map((h) => (
							<div key={h.id} className="rounded-lg border border-border p-3">
								<p className="hanzi-lg text-2xl font-black">{h.char}</p>
								<p className="text-sm font-bold">{h.meaningVi}</p>
								<p className="text-xs text-muted">{h.pinyin} · Bộ {h.radical}</p>
								{h.mnemonicVi && <p className="mt-1 text-xs text-foreground-secondary">{h.mnemonicVi}</p>}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
