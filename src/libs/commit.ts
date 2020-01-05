import { CommitCheck, Commit } from "../entity";
import { normalizeCheckState } from "./github";

export async function createCommitCheckFromStatus(status: Octokit.ReposListStatusesForRefResponseItem, commit: Commit) {
  const check = CommitCheck.updateOrCreate({commit: commit, name: status.context}, {
    githubId: status.id,
    name: status.context,
    status: normalizeCheckState(status.state) as any,
    description: status.description,
    targetUrl: status.target_url,
    type: 'standard',
    rawData: status as any,
    commit: commit
  })

  return check
}

export async function createCommitCheckFromCheckRun(checkRun: Octokit.ChecksListForRefResponseCheckRunsItem, commit: Commit) {
  const check = CommitCheck.updateOrCreate({name: checkRun.name, commit: commit}, {
    githubId: checkRun.id,
    name: checkRun.name,
    status: normalizeCheckState(checkRun.status) as any,
    description: checkRun.output.text,
    targetUrl: checkRun.details_url,
    type: 'standard',
    rawData: checkRun as any,
    commit: commit
  })

  return check;
}