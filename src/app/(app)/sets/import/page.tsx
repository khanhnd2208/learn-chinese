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
				<span className="label-caps mt-4 block tracking-widest">Thêm bộ từ</span>
				<h1 className="mt-2 text-3xl font-black text-foreground">Import từ Excel</h1>
				<p className="mt-2 max-w-2xl text-sm text-foreground-secondary">
					Tải file mẫu HSK1 (7 cột: bo_tu, simplified, pinyin, meaning_vi, han_viet, part_of_speech, ghi_chu)
					hoặc tự tạo file theo cùng định dạng để import bộ riêng cho luyện tập và SRS.
				</p>
			</section>

			<div className="card-paper p-8 text-center md:hidden">
				<MaterialIcon name="computer" className="mx-auto text-muted" size={48} />
				<p className="mt-4 text-sm text-foreground-secondary">
					Tính năng import Excel khuyên dùng trên máy tính để dễ quản lý file và kiểm tra dữ liệu.
				</p>
				<Link href="/sets" className="btn-primary mt-6">
					<MaterialIcon name="arrow_back" size={16} />
					Quay lại bộ từ
				</Link>
			</div>

			<div className="hidden md:block">
				<SetImportWizard />
			</div>
		</div>
	);
}
