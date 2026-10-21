import { withAdmin, apiSuccess, apiError } from '@/lib/apiUtils';
import { applyExampleQualityAction, listFlaggedExamples } from '@/services/chinese/cnExampleQualityService';

const ACTIONS = ['retire', 'dismiss', 'edit', 'accept-answers'] as const;
type Action = (typeof ACTIONS)[number];

function isAction(value: string | undefined): value is Action {
	return ACTIONS.some((action) => action === value);
}

export const GET = withAdmin(async () => {
	const examples = await listFlaggedExamples();
	return apiSuccess({ examples });
});

export const POST = withAdmin(async (req) => {
	const body = await req.json() as {
		exampleId?: string;
		action?: string;
		hanzi?: string;
		pinyin?: string;
		meaningVi?: string;
		answers?: string[];
	};
	if (!body.exampleId || !isAction(body.action)) {
		return apiError('exampleId và action là bắt buộc', 400);
	}
	const result = await applyExampleQualityAction({
		exampleId: body.exampleId,
		action: body.action,
		hanzi: body.hanzi,
		pinyin: body.pinyin,
		meaningVi: body.meaningVi,
		answers: body.answers,
	});
	return apiSuccess(result);
});
