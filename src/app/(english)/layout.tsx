import { redirect } from 'next/navigation';
import Link from 'next/link';
import EnglishShell from '@/components/english/EnglishShell';
import { auth } from '@/lib/auth';
import { englishAreaOpenForRole } from '@/lib/english/access';

export default async function EnglishLayout({ children }: { children: React.ReactNode }) {
	const session = await auth();
	if (!session?.user) redirect('/login');
	if (!englishAreaOpenForRole(session.user.role)) {
		return (
			<div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
				<h1 className="text-3xl font-black text-foreground">Phần tiếng Anh chưa được mở</h1>
				<p className="text-muted">Khu này sẽ mở sau khi nội dung được kiểm tra. Tiếng Trung vẫn học bình thường.</p>
				<Link href="/" className="font-bold text-accent">Về tiếng Trung</Link>
			</div>
		);
	}
	return <EnglishShell>{children}</EnglishShell>;
}
