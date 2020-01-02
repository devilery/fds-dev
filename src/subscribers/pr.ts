import { strict as assert } from 'assert'
import httpContext from 'express-http-context'
import {Like} from "typeorm";
const { Base64 } = require('js-base64');

import { Commit, CommitCheck, PullRequest, User, Team, PullRequestReview, GithubUser, PullRequestReviewRequest, Repository, Pipeline } from '../entity';
import { ICommitCheck, IPullRequestEvent, IPullRequestReviewEvent, IPullRequestReviewRequest } from '../events/types';
import { ChatPostMessageResult } from '../libs/slack-api'

import { getPrMessage, IMessageData, getChecksSuccessMessage, getCheckErrorMessage, getReviewMessage, getReviewRequestNotification } from '../libs/slack-messages'
import { createOrUpdatePr, isHeadCommitCheck } from '../libs/pr';
import { updatePrMessage, sendPipelineNotifiation } from '../libs/slack'
const { jobDetails } = require('../libs/circleci');
const { sleep } = require('../libs/util');

const CIRCLE_JOB_PREFIX = 'ci/circleci: ';
const CI_SLEEP = typeof process.env.CI_SLEEP !== 'undefined' ? parseInt(process.env.CI_SLEEP, 10) : 7000;

const opened = async function (data: IPullRequestEvent) {
	const pr = await createOrUpdatePr(data)
	const client = pr.user.team.getSlackClient()

	const messageData = getPrMessage(pr)

	const res = await client.chat.postMessage({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId}) as ChatPostMessageResult
	pr.slackThreadId = res.message.ts
	await pr.save()
};

opened.eventType = 'pr.opened';

async function pullRequestClosed(reviewRequest: IPullRequestEvent) {
	const pr = await createOrUpdatePr(reviewRequest)
	const team = httpContext.get('team')
	console.log('pr closed/merged')
	console.log(reviewRequest.merged)

	const text = reviewRequest.merged ? '✅ PR has been merged' : '🗑 PR has been closed';
	// const repo = Repository.findOneOrFail({where: {githubId: reviewRequest.repository.id}})
	// const pr = await PullRequest.findOneOrFail({where: {githubId: reviewRequest.id}, relations: ['user']})
	assert(pr.user, 'PR doesnt have user relation')
	assert(pr.slackThreadId, 'PR does not have slack thread id')

	const client = team.getSlackClient()
	await client.chat.postMessage({ text, channel: pr.user.slackImChannelId, thread_ts: pr.slackThreadId, link_names: true })

	const messageData = getPrMessage(pr)

	await client.chat.update({text: messageData.text, blocks: messageData.blocks, channel: pr.user.slackImChannelId, ts: pr.slackThreadId})
}

pullRequestClosed.eventType = 'pr.closed'

const commitCheckUpdate = async function (check: ICommitCheck) {
	// {
	//   status: 'success',
	//   type: 'standard',
	//   from: 'github',
	//   id: 8461715742,
	//   commit_sha: '89bc4f598f8628f12f540057ca8d45f5fe2224c2',
	//   name: 'ci/circleci: some-deployment',
	//   target_url: 'https://circleci.com/gh/devilery/fds-dev/873?utm_campaign=vcs-integration-link&utm_medium=referral&utm_source=github-build-link',
	//   context: 'ci/circleci: some-deployment',
	//   description: 'Your tests passed on CircleCI!',
	//   pull_request_id: 23,
	//   raw_data: {
	// console.log('check', check)
	let commit = await Commit.findOneOrFail({ where: { sha: check.commit_sha }, relations: ['checks'] })
	console.log('commit ID', commit.id, 'check', check.name, check.status)
	const pr = await PullRequest.findOneOrFail({ where: { id: check.pull_request_id }, relations: ['user', 'user.team'] })
	const { user } = pr
	const { team } = user

	// TODO: handle commit pipeline re-run (PR's pipelines status gets reset as new commits arrive)
	// TODO: maybe move circle logic to status webook handler??
	if (check.name && check.name.includes(CIRCLE_JOB_PREFIX)) {
		const checkName = check.name.replace(CIRCLE_JOB_PREFIX, '');
		console.log('check name', checkName)
		check.type = 'ci-circleci';

		// TODO: race conditions?; add transaction???
		if (team.circlePersonalToken) {
			const circleCiData = await jobDetails({ jobUrl: check.target_url, token: team.circlePersonalToken })
			assert(circleCiData.raw_job_data.platform === '2.0', 'Unsupported CircleCI version')
			// workflows(workflow_id), build_time_millis, lifecycle, status, previous(build_num, status, build_time_millis), fail_reason, steps(*)
			// console.log(circleCiData.raw_job_data, circleCiData.workflow.raw_workflow_job_data.items)
			// TODO: crate or update PR pipeline

			const pipelineRaw = circleCiData.workflow.raw_workflow_job_data

			const pl = await Pipeline.findOrCreate<Pipeline>({pullRequest: pr}, {rawData: pipelineRaw})
			// console.log(pl, pl.rawData.items)

			// build f847fe95-ba3b-4638-908f-9aa8521295b8 success build
			// approve-long-tests b5a7a5fc-7d0a-4007-9f46-caa1e02a1893 on_hold approval
			// chained-approval dd9d6ccd-f868-43e1-bde2-73b0ba3ae276 blocked approval
			// long-running-tests da6fb088-6477-4efc-a6cb-feb9c237edd5 blocked build
			await Promise.all(pipelineRaw.items.map(async step => {
				// console.log(step.name, step.id, step.status, step.type)

				const fullStepName = CIRCLE_JOB_PREFIX + step.name;

				// TODO: we prolly don't need this anymore
				// if (step.name === checkName) {
				// 	if (step.status !== check.status) {
				// 		console.log('status update', step.status, '->', check.status)
				// 	}
				// }


				// const loadedPosts = await connection.getRepository(Post).find({
				//     title: Like("%out #%")
				// });
				// TODO: normalize check.status
				const commitCheck = await CommitCheck.findOrCreate<CommitCheck>({commit, type: 'ci-circleci', name: fullStepName}) //Like('% ' + step.name)
				console.log('commit check in db', commitCheck)
				// upsert
				if (commitCheck.status !== step.status) {
					commitCheck.status = step.status;
					await commitCheck.save()
				}
			}))

			// TODO: raw data version; DEPRECATE
			// const pipelineDone = pl.rawData.items.every(item => item.status === 'success')
			// pipelineDone && console.log('pipe done!!')



			// update data for next webhook
			// TODO: different field order OMG
			// console.log(JSON.stringify(pipelineRaw), JSON.stringify(pl.rawData))
			// if (JSON.stringify(pipelineRaw) !== JSON.stringify(pl.rawData)) {
			// 	console.log('updating pipeline')
			// 	pl.rawData = pipelineRaw
			// 	await pl.save()
			// }

			// TODO: connect pipeline to commitchecks????

			check.ci_data = {
				estimate_ms: circleCiData.estimate_ms,
				jobs_on_hold: circleCiData.workflow.jobs_on_hold
			}
		} else {
			console.error('Team is missing Circld token')
		}
	}

	// TODO: we are picking up the new set status value
	let dbCheck = await CommitCheck.findOne({ where: { commitId: commit.id, type: check.type, name: check.name }})


	console.log(dbCheck.status, check.status)
	if (dbCheck) {
		// if changed to done then wait. This way other pending events can activate and entire check flow will not return done
		if (dbCheck.status === 'pending' && check.status === 'success') {
			// await sleep(CI_SLEEP) // wait for other events to start if exists
		}

		// TODO: fix for the circle CI set value in `commitCheck`
		if (dbCheck.status === check.status) {
			console.log('exiting function (status equals)')
			return;
		}

	} else {
		dbCheck = new CommitCheck()
	}

	// upsert info
	dbCheck.githubId = check.id;
	dbCheck.targetUrl = check.target_url;
	dbCheck.rawData = check

	dbCheck.name = check.name;
	dbCheck.status = check.status;
	dbCheck.type = check.type as any;
	dbCheck.commit = commit

	await dbCheck.save()
	await dbCheck.reload()

	// TODO: maybe we can remove this redundant query
	// commit = await Commit.findOneOrFail({ where: { sha: check.commit_sha }, relations: ['checks'] })
	// console.log(commit.checks)
	// await commit.reload()
	// console.log(commit.checks)
	// commit = await Commit.findOneOrFail({ where: { sha: check.commit_sha }, relations: ['checks'] })
	// console.log(commit.checks)

	// commit.reload does not reload relations
	const finalChecks = await CommitCheck.find({where: {commit}})
	console.log(finalChecks.length)

	let isHeadCommit = await isHeadCommitCheck(check.commit_sha, check.pull_request_id)

	if (!isHeadCommit) {
		return
	}

	const { checks } = commit

	await updatePrMessage(pr, checks)

	await sendPipelineNotifiation(pr, checks, dbCheck)
}
commitCheckUpdate.eventType = 'pr.check.update'


const pullRequestReviewed = async function (reviewEvent: IPullRequestReviewEvent) {
	const pr = await PullRequest.findOneOrFail({ where: { id: reviewEvent.pull_request_id }, relations: ['user', 'user.team'] })
	const user = pr.user
	const team = user.team
	const client = team.getSlackClient()
	const ghReviewUser = await GithubUser.findOne({ where: { githubId: reviewEvent.user.github_id } })
	const reviewUser = await User.findOne({ where: { githubUser: ghReviewUser, team: team } })

	// check if any empty review request exists for this user. If so fill it with this review.
	// we use remote username as a key
	const reviewRequest = await PullRequestReviewRequest.findOne({ where: { reviewUsername: reviewEvent.user.github_login, pullRequest: pr, review: null } })

	const review = await PullRequestReview.create({
		remoteId: reviewEvent.remoteId,
		state: reviewEvent.state,
		websiteUrl: reviewEvent.website_url,
		rawData: reviewEvent.raw_data,
		reviewUserName: reviewEvent.user.github_login,
		reviewUser: reviewUser,
		reviewRequest: reviewRequest,
		pullRequest: pr
	})

	await review.save()

	let username = review.reviewUserName;

	if (reviewUser) {
		const slackUsername = await reviewUser.getSlackUsername();
		username = `@${slackUsername}`
	}

	const notification = getReviewMessage(review, username);
	client.chat.postMessage({ text: notification.text, channel: user.slackImChannelId, thread_ts: pr.slackThreadId ? pr.slackThreadId : undefined, link_names: true })
}

pullRequestReviewed.eventType = 'pr.reviewed'

const pullRequestReviewRequest = async function (reviewRequest: IPullRequestReviewRequest) {
	const pr = await PullRequest.findOneOrFail(reviewRequest.pull_request_id, { relations: ['user'] })
	const assigneeUser = await User.findOne(reviewRequest.assignee_user_id, { relations: ['team'] })

	// one user can have only one *EMPTY* (without finished review) request for PR. Delete the old ones in case of network or DB errors / bugs
	const oldRequests = await PullRequestReviewRequest.find({ where: { pullRequest: pr, assigneeUser, reviewUsername: reviewRequest.review_username, review: null } })
	for (let oldRequest of oldRequests) {
		await oldRequest.remove()
	}

	const request = await PullRequestReviewRequest.create({ pullRequest: pr, assigneeUser, reviewUsername: reviewRequest.review_username })
	await request.save()

	if (assigneeUser) {
		await request.reload()
		const requesterUsername = await pr.user.getSlackUsername()
		const notification = getReviewRequestNotification(request, requesterUsername)
		const client = assigneeUser.team.getSlackClient()
		await client.chat.postMessage({ text: notification.text, channel: assigneeUser.slackImChannelId, link_names: true })
	}
}

pullRequestReviewRequest.eventType = 'pr.review.request'

module.exports = [opened, commitCheckUpdate, pullRequestReviewed, pullRequestReviewRequest, pullRequestClosed]
