import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

const MODES = [
	{
		href: '/hht',
		title: 'HHT Mode',
		description: 'Trắc nghiệm trên các bộ đang bật SRS. Không đổi lịch ôn.',
		icon: 'quiz',
	},
	{
		href: '/inferno',
		title: 'Địa Ngục',
		description: 'Drill khó, tính điểm riêng. Không đổi lịch ôn.',
		icon: 'local_fire_department',
	},
	{
		href: '/dashboard?tab=inferno',
		title: 'Báo cáo Địa Ngục',
		description: 'Điểm và từ đang kẹt. Dữ liệu cũ vẫn được giữ.',
		icon: 'query_stats',
	},
] as const;

export default function ExperimentsPage() {
	return (
		<div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8">
			<section className="animate-section-in">
				<span className="label-caps tracking-widest">Không nằm lộ trình chính</span>
				<h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Thử nghiệm</h1>
				<p className="mt-2 max-w-2xl text-sm text-foreground-secondary">
					HHT và Địa Ngục vẫn mở được và vẫn giữ dữ liệu. Hai chế độ này không còn trên menu chính hay thanh dưới.
					Sau một chu kỳ đo mới quyết định có gỡ code hay không.
				</p>
			</section>
			<div className="grid gap-3">
				{MODES.map((mode) => (
					<Link key={mode.href} href={mode.href} className="block">
						<Card interactive>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<MaterialIcon name={mode.icon} size={20} />
									{mode.title}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription>{mode.description}</CardDescription>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
