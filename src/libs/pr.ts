import { PullRequest, User } from "../entity";

export async function createOrUpdatePr(pullRequest: any) {
  let pr = await PullRequest.findOne({where: {githubId: pullRequest.id}})

  if (!pr) {
    pr = new PullRequest();
  }
	  

  pr.rawData = pullRequest;
  pr.websiteUrl = pullRequest.website_url;
  if (pullRequest.user_id) {
  	const user = await User.findOne({where: {id: pullRequest.user_id}})
  	if (user) {
      pr.user = user;
    }
  }
  pr.title = pullRequest.title;
  pr.prNumber = pullRequest.pr_number;
  pr.headSha = pullRequest.head_sha;
  pr.githubId = pullRequest.id;

  await pr.save()

  return pr
}

export async function isHeadCommitCheck(sha: string, pullRequestId: number) {
  const pullRequest = await PullRequest.findOneOrFail({ where: { id: pullRequestId } })
  return pullRequest.headSha === sha
}

module.exports = { createOrUpdatePr, isHeadCommitCheck }
