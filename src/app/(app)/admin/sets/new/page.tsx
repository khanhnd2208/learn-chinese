import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';
import SetImportWizard from '@/app/(app)/sets/import/SetImportWizard';

export const dynamic = 'force-dynamic';

export default function AdminNewSetPage() {
	return (
		<div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
			<Link href="/admin/sets" className="flex items-center gap-1 text-sm text-muted hover:text-accent">
				<MaterialIcon name="arrow_back" size={16} />
				Bộ từ
			</Link>
			<header>
				<p className="label-caps">Tạo bộ từ</p>
				<h1 className="mt-2 text-3xl font-black text-foreground">Excel hoặc AI Smart Import</h1>
				<p className="mt-2 max-w-2xl text-sm text-muted">
					Tạo bộ từ, thêm từ, rồi xuất bản. Người học theo học bộ gốc.
				</p>
			</header>
			<SetImportWizard />
		</div>
	);
}
