'use client';

import { useState } from 'react';
import {
	Avatar,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Checkbox,
	Dialog,
	Divider,
	EmptyState,
	ErrorState,
	FormField,
	Input,
	Pagination,
	ProgressBar,
	Radio,
	Select,
	Skeleton,
	Spinner,
	Switch,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
	ThemeToggle,
	useToast,
} from '@/components/ui';
import MaterialIcon from '@/components/ui/MaterialIcon';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="space-y-4">
			<h2 className="text-xl font-black text-foreground">{title}</h2>
			{children}
		</section>
	);
}

export default function UiLabClient() {
	const { toast } = useToast();
	const [tab, setTab] = useState('a');
	const [dialogOpen, setDialogOpen] = useState(false);
	const [switchOn, setSwitchOn] = useState(false);
	const [page, setPage] = useState(1);

	return (
		<div className="mx-auto max-w-4xl space-y-12 px-4 py-8 md:px-8">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="label-caps">Internal</p>
					<h1 className="text-3xl font-black text-foreground">UI Lab</h1>
					<p className="mt-1 text-sm text-muted">Ink &amp; Vermillion design system showcase</p>
				</div>
				<ThemeToggle />
			</header>

			<Section title="Buttons">
				<div className="flex flex-wrap gap-3">
					<Button>Primary</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="tertiary">Tertiary</Button>
					<Button variant="destructive">Destructive</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="link">Link</Button>
					<Button loading>Loading</Button>
					<Button disabled>Disabled</Button>
					<Button leftIcon={<MaterialIcon name="play_arrow" size={16} />}>With icon</Button>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button size="sm">Small</Button>
					<Button size="md">Medium</Button>
					<Button size="lg">Large</Button>
				</div>
			</Section>

			<Section title="Form controls">
				<div className="grid gap-6 md:grid-cols-2">
					<FormField label="Email" hint="Nhập email của bạn">
						<Input placeholder="email@example.com" />
					</FormField>
					<FormField label="Lỗi" error="Trường bắt buộc">
						<Input error placeholder="Lỗi validation" />
					</FormField>
					<FormField label="Ghi chú">
						<Textarea placeholder="Nội dung dài..." />
					</FormField>
					<FormField label="Chế độ">
						<Select>
							<option>Hỗn hợp</option>
							<option>Nghĩa</option>
						</Select>
					</FormField>
					<Checkbox label="Bật SRS" defaultChecked />
					<Radio name="mode" label="Luyện tập" defaultChecked />
					<Switch label="Thông báo" checked={switchOn} onCheckedChange={setSwitchOn} />
				</div>
			</Section>

			<Section title="Badges &amp; Avatar">
				<div className="flex flex-wrap items-center gap-3">
					<Badge>Default</Badge>
					<Badge variant="accent">Accent</Badge>
					<Badge variant="success">Success</Badge>
					<Badge variant="warning">Warning</Badge>
					<Badge variant="error">Error</Badge>
					<Avatar name="Nguyen Van A" />
					<Avatar name="Test User" size="lg" />
				</div>
			</Section>

			<Section title="Card &amp; Progress">
				<Card interactive className="max-w-sm">
					<CardHeader>
						<CardTitle>Bộ từ HSK 1</CardTitle>
						<CardDescription>24 từ · 3 kênh cần ôn</CardDescription>
					</CardHeader>
					<CardContent>
						<ProgressBar value={65} />
					</CardContent>
				</Card>
			</Section>

			<Section title="Tabs">
				<Tabs value={tab} onValueChange={setTab}>
					<TabsList>
						<TabsTrigger value="a">Tab A</TabsTrigger>
						<TabsTrigger value="b">Tab B</TabsTrigger>
					</TabsList>
					<TabsContent value="a">Nội dung tab A</TabsContent>
					<TabsContent value="b">Nội dung tab B</TabsContent>
				</Tabs>
			</Section>

			<Section title="States">
				<div className="grid gap-6 md:grid-cols-2">
					<EmptyState
						title="Chưa có bộ từ"
						description="Tạo bộ từ sau buổi học để bắt đầu."
						action={{ label: 'Import từ', href: '/sets/import' }}
					/>
					<ErrorState onRetry={() => toast('Đã thử lại', 'info')} />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton lines={3} />
					<Spinner />
				</div>
			</Section>

			<Section title="Overlay &amp; Toast">
				<div className="flex flex-wrap gap-3">
					<Button onClick={() => setDialogOpen(true)}>Mở Dialog</Button>
					<Button variant="secondary" onClick={() => toast('Đã lưu thành công', 'success')}>
						Toast success
					</Button>
					<Button variant="secondary" onClick={() => toast('Không thể lưu', 'error')}>
						Toast error
					</Button>
				</div>
				<Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Xác nhận" description="Bạn có chắc không?">
					<div className="flex justify-end gap-2">
						<Button variant="secondary" onClick={() => setDialogOpen(false)}>Hủy</Button>
						<Button onClick={() => setDialogOpen(false)}>Xác nhận</Button>
					</div>
				</Dialog>
			</Section>

			<Section title="Pagination &amp; Divider">
				<Pagination page={page} totalPages={5} onPageChange={setPage} />
				<Divider className="my-4" />
			</Section>

			<Section title="Typography — Hanzi">
				<p className="hanzi-display text-foreground" lang="zh-Hans">学习</p>
				<p className="hanzi-lg text-foreground" lang="zh-Hans">中文</p>
			</Section>
		</div>
	);
}
