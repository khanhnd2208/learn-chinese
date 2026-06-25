import { redirect } from 'next/navigation';

export default function InfernoStatsPage() {
	redirect('/dashboard?tab=inferno');
}
