import { PullRequest, User, Repository, Commit } from "../entity";
import { getCommitInfo, getCommitStatuses } from './github-api';
import { createOrUpdateCommit } from './github';
import { createOrUpdateCommitStatus } from "./commit";
import { isCircleCheck } from "./circleci";


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

export async function rebuildPullRequest(pr: PullRequest) {
  const repo = await pr.relation('repository');
  const owner = await repo.relation('owner');
  const headCommit = Commit.findOneOrFail({ where: { sha: pr.headSha } });

  if (!headCommit) {
    const commitInfo = await getCommitInfo(owner.login, repo.name, pr.headSha, owner.githubAccessToken)
    const commit = await createOrUpdateCommit(commitInfo, [pr])
    const statusResponse: any = await getCommitStatuses(owner.login, repo.name, commit.sha, owner.githubAccessToken)
    const statuses: Octokit.ReposListStatusesForRefResponse = statusResponse.statuses;

    let circleCiStatuses = statuses.filter(item => item.context.includes('ci/circleci: '))

    for (let status of statuses) {
      await createOrUpdateCommitStatus(status)
    }
  }
  
}


export async function isHeadCommitCheck(sha: string, pullRequestId: number) {
  const pullRequest = await PullRequest.findOneOrFail({ where: { id: pullRequestId } })
  return pullRequest.headSha === sha
}

module.exports = { createOrUpdatePr, isHeadCommitCheck }
