import Link from 'next/link';
import { redirect } from 'next/navigation';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SetImportWizard from '@/app/(app)/sets/import/SetImportWizard';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SetImportPage() {
	const session = await auth();
	if (!session?.user) redirect('/login');

	return (
		<div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
			<section>
				<Link href="/sets" className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent">
					<MaterialIcon name="arrow_back" size={16} />
					Bộ từ
				</Link>
				<span className="label-caps mt-4 block tracking-widest">Import từ</span>
				<h1 className="mt-2 text-3xl font-black text-foreground">Import từ</h1>
				<p className="mt-2 max-w-2xl text-sm text-foreground-secondary">
					Tải file Excel theo mẫu hệ thống, hoặc dùng <strong>AI Smart Import</strong>: copy prompt có sẵn sang Gen AI bên ngoài, rồi dán kết quả TSV trở lại app — không cần tự làm file Excel.
				</p>
				<p className="mt-2 text-xs text-muted md:hidden">
					Trên điện thoại vẫn import được — nên dùng file .xlsx từ Files/Drive.
				</p>
			</section>

			<SetImportWizard />
		</div>
	);
}
