import { PullRequest, User, Repository, Commit } from "../entity";
import { getCommitInfo, getCommitStatuses, getCommitCheckRuns } from './github-api';
import { createOrUpdateCommit, normalizeCheckState } from './github';
import { createCommitCheckFromStatus, createCommitCheckFromCheckRun } from "./commit";
import { ICommitCheck } from "../events/types";
import { updatePipeline } from "./circleci";
import { emmit } from "./event";
import { debounce } from './util';

export async function createOrUpdatePr(pullRequest: any) {
  let pr = await PullRequest.findOne({where: {githubId: pullRequest.id}, relations: ['user', 'user.team']})

  if (!pr) {
    pr = new PullRequest();
  }

  pr.rawData = pullRequest;
  pr.websiteUrl = pullRequest.website_url;
  if (pullRequest.user_id) {
    const user = await User.findOne({where: {id: pullRequest.user_id}, relations: ['team']})
  	if (user) {
      pr.user = user;
    }
  }
  pr.title = pullRequest.title;
  pr.prNumber = pullRequest.pr_number;
  pr.headSha = pullRequest.head_sha;
  pr.githubId = pullRequest.id;
  pr.state = pullRequest.state;
  pr.repository = await Repository.findOneOrFail({ where: { githubId: pullRequest.repository.id } })

  await pr.save()
  await pr.reload()

  return pr
}

export async function rebuildPullRequest(pr_id: number) {
  const pr = await PullRequest.findOneOrFail(pr_id);

  const repo = await pr.relation('repository');
  const owner = await repo.relation('owner');

  const commitInfo = await getCommitInfo(owner.login, repo.name, pr.headSha, owner.githubAccessToken)
  const commit = await createOrUpdateCommit(commitInfo, [pr])
  const statusResponse: any = await getCommitStatuses(owner.login, repo.name, commit.sha, owner.githubAccessToken)
  const checkRunsResponse = await getCommitCheckRuns(owner.login, repo.name, commit.sha, owner.githubAccessToken)

  let statuses: Octokit.ReposListStatusesForRefResponse = statusResponse.statuses;
  let circleCiStatuses = statuses.filter(item => item.context.includes('ci/circleci: '))

  statuses = statuses.filter(item => !item.context.includes('ci/circleci: '))
  for (let status of statuses) {
    await createCommitCheckFromStatus(status, commit)
  }

  const checkRuns = checkRunsResponse.check_runs
  for (let checkRun of checkRuns) {
    await createCommitCheckFromCheckRun(checkRun, commit)
  }

  for (let circleCheck of circleCiStatuses) {

    let data: ICommitCheck = {
      status: normalizeCheckState(circleCheck.state) as any,
      type: 'ci-circleci',
      from: 'github',
      id: circleCheck.id,
      commit_sha: commit.sha,
      name: circleCheck.context,
      target_url: circleCheck.target_url,
      description: circleCheck.description,
      pull_request_id: pr.id,
      raw_data: circleCheck,
      ci_data: {}
    }

    await updatePipeline(pr, commit, data)
  }

  emmit('pr.rebuilded', { pr_id: pr.id })
}

export const debouceRebuildPr = debounce(rebuildPullRequest, 3000)

export async function isHeadCommitCheck(sha: string, pullRequestId: number) {
  const pullRequest = await PullRequest.findOneOrFail({ where: { id: pullRequestId } })
  return pullRequest.headSha === sha
}