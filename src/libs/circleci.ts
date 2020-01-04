import { strict as assert } from 'assert'
import httpContext from 'express-http-context'
import { ICommitCheck } from '../events/types'
import {PullRequest,Team,Pipeline,Commit,CommitCheck} from '../entity'
import { jobDetails, workflowDetails } from '../libs/circleci-api';

const CIRCLE_JOB_PREFIX = 'ci/circleci: ';

export async function loadPipeline(pr: PullRequest, checkUrl: string) {
	const team = httpContext.get('team') as Team

	// console.error('Team is missing Circle token')
	if (!team.circlePersonalToken) throw new Error('Team is missing Circle token');

	// TODO: approval jobs return 404
	const circleCiData = await jobDetails({ jobUrl: checkUrl, token: team.circlePersonalToken })
	assert(circleCiData.raw_job_data.platform === '2.0', 'Unsupported CircleCI version')
	// workflows(workflow_id), build_time_millis, lifecycle, status, previous(build_num, status, build_time_millis), fail_reason, steps(*)

	const pipelineRaw = circleCiData.workflow.raw_workflow_job_data

	const newPipeline = Pipeline.create({pullRequest: pr, rawData: pipelineRaw})
	await newPipeline.save()
	await newPipeline.reload()

	return newPipeline
}

async function updateCommitChecks(commit: Commit, pipelineRaw: any, check: ICommitCheck | null = null) {
	await Promise.all(pipelineRaw.items.map(async (pipelineCheck: {name: string, id: string, status: string, type: string}) => {
		const fullCheckName = CIRCLE_JOB_PREFIX + pipelineCheck.name;
		const [ commitCheck, _ ] = await CommitCheck.findOrCreate<CommitCheck>({commit, type: 'ci-circleci', name: fullCheckName}, {status: pipelineCheck.status})
		// upsert status
		if (commitCheck.status !== pipelineCheck.status) {
			commitCheck.status = pipelineCheck.status;

			await commitCheck.save()
		}

		if (check && fullCheckName === check.name) {
			commitCheck.rawData = check.raw_data;

			await commitCheck.save()
		}
	}))
}

export async function updatePipeline(pr: PullRequest, commit: Commit, check: ICommitCheck): Promise<void> {
	// const checkName = check.name.replace(CIRCLE_JOB_PREFIX, '');
	// console.log('check name', checkName)

	// if we don't have the pipeline, download it and use its state (prolly more fresh than webhook data)
		// populate the database with checks according to the pipeline data

	const prPipeline = await Pipeline.findOne({ where: { pullRequest: pr } });

	// TODO: query this on PR open
	// TODO: race conditions?; add transaction???
	// TODO: race condition when we receive another check webhook?
	if (!prPipeline) {
		console.log('downloading pipeline')
		const pipeline = await loadPipeline(pr, check.target_url)

		await updateCommitChecks(pipeline.rawData, commit, check);

		// newPipeline.reload();
		// return newPipeline;

	// if we already have pipeline data, use the webhook check data to update the single check
	} else {
		console.log('updating check')
		// const singleCheck = await CommitCheck.updateOrCreate({commit, type: 'ci-circleci', name: check.name}, {status: check.status, rawData: check.raw_data});

		const singleCheck = await CommitCheck.findOne({commit, type: 'ci-circleci', name: check.name})

		// approval steps will not be found
		if (!singleCheck) {
			// refresh pipeline
			console.log('missing check', check.name, check.target_url, /*check*/)
			// use target url to parse out workflow ID
			// download workflow and save new pipeline data
			const m = check.target_url.match(/\/workflow-run\/([a-f0-9-]+)/)
			console.log('m', m)

			assert(m && m[1], 'Check URL does not contain workflow')

			const team = httpContext.get('team') as Team

			// console.error('Team is missing Circle token')
			if (!team.circlePersonalToken) throw new Error('Team is missing Circle token');

			const pipeData = await workflowDetails({workflowId: m[1], token: team.circlePersonalToken})

			// const pipeline = Pipeline.create({pullRequest: pr, rawData: pipeData.raw_workflow_job_data})
			const update = await Pipeline.update({pullRequest: pr}, {rawData: pipeData.raw_workflow_job_data})
			if (!update || update.affected < 0) {
				await Pipeline.create({pullRequest: pr, rawData: pipeData.raw_workflow_job_data}).save()
			}

			await updateCommitChecks(pipeData.raw_workflow_job_data, commit, check);
		} else {
			// singleCheck.status = check.status;
			// singleCheck.rawData = check.raw_data;
			// await singleCheck.save();
			await CommitCheck.update(singleCheck.id, {status: check.status, rawData: check.raw_data})
		}

		// return prPipeline;
	}

	// then run the pipeline final status check


	// 	// TODO: we prolly don't need this anymore
	// 	// if (step.name === checkName) {
	// 	// 	if (step.status !== check.status) {
	// 	// 		console.log('status update', step.status, '->', check.status)
	// 	// 	}
	// 	// }

	// 	// TODO: normalize step.status
	// 	const commitCheck = await CommitCheck.findOrCreate<CommitCheck>({commit, type: 'ci-circleci', name: fullStepName}, {status: step.status})
	// 	console.log('commit check in db', commitCheck)
	// 	// upsert
	// 	if (commitCheck.status !== step.status) {
	// 		commitCheck.status = step.status;
	// 		await commitCheck.save()
	// 	}
	// }))
}
