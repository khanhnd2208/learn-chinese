import type { CnCoverageReportDTO } from '@/types/chinese';

interface Props {
	coverage: CnCoverageReportDTO;
}

export default function CoverageReport({ coverage }: Props) {
	const { total } = coverage;
	return (
		<div className="card-paper p-4 text-sm">
			<h3 className="font-bold text-foreground">Báo cáo dữ liệu</h3>
			<ul className="mt-3 space-y-1 text-foreground-secondary">
				<li>{coverage.inDatabase}/{total} từ có trong database</li>
				<li>{coverage.hasPinyin}/{total} từ có pinyin</li>
				<li>{coverage.hasMeaning}/{total} từ có nghĩa tiếng Việt</li>
				<li>{coverage.hasAudio}/{total} từ có audio (Web Speech)</li>
				<li>{coverage.hasCharAnalysis}/{total} từ có phân tích chữ chi tiết</li>
			</ul>
			<h4 className="mt-4 font-semibold text-foreground">Sẵn sàng luyện tập</h4>
			<ul className="mt-2 space-y-1 text-foreground-secondary">
				<li>{coverage.hasExample}/{total} từ có ví dụ câu</li>
				<li>{coverage.hasPattern}/{total} từ có mẫu câu</li>
				<li>{coverage.supportsSentence}/{total} từ luyện được câu (điền/sắp xếp/dịch)</li>
				<li>{coverage.supportsHanziMemory}/{total} từ luyện được chữ Hán (bộ thủ/thành phần)</li>
				<li>{coverage.supportsSimilarChar}/{total} từ luyện được chữ tương tự</li>
			</ul>
			{coverage.pending.length > 0 && (
				<div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
					<p className="label-caps text-warning">Chờ bổ sung dữ liệu</p>
					<p className="mt-1 text-sm">{coverage.pending.join(', ')}</p>
				</div>
			)}
		</div>
	);
}
