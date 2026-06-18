import Image from 'next/image';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import SignInWithGoogleButton from './sign-in-with-google-button';

export default async function LoginPage() {
	const session = await auth();
	if (session?.user) redirect('/');

	return (
		<div className="relative flex min-h-screen items-center justify-center bg-background px-6">
			<div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8">
				<div className="flex items-center gap-3">
					<Image
						src="/app-icon.png"
						alt="Học Hán Ngữ"
						width={48}
						height={48}
						className="rounded-xl border border-border"
					/>
					<div>
						<p className="label-caps">Học Hán Ngữ</p>
						<h1 className="text-2xl font-black text-foreground">
							Vocabulary Mastery
						</h1>
					</div>
				</div>
				<p className="mt-4 text-sm text-foreground-secondary">
					Đăng nhập để tạo bộ từ, ôn SRS, luyện nghe và phân tích chữ Hán.
				</p>
				<div className="mt-8">
					<SignInWithGoogleButton callbackUrl="/" />
				</div>
				<p className="mt-6 text-center text-xs text-muted">
					App độc lập — không liên kết với toiladuykhanh.com
				</p>
			</div>
		</div>
	);
}
