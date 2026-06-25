'use client';

import InfernoReportPanel from '@/components/chinese/InfernoReportPanel';

/** @deprecated Use InfernoReportPanel inside LearningReportTabs at /dashboard?tab=inferno */
export default function InfernoStatsClient() {
	return (
		<div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
			<InfernoReportPanel />
		</div>
	);
}
