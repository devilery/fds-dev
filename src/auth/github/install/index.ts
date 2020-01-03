// @ts-ignore
import { strict as assert } from 'assert';
import url from 'url';
import { Team, GithubOwner, Repository } from '../../../entity'
import { createInstallationToken } from '../../../libs/github-api';
import axios from 'axios';
const { emmit } = require('../../../libs/event.js');


export default async function setup(req: any, res: any) {
  let query = url.parse(req.url, true).query
  let installation_id = query.installation_id as string
  let team_id = query.state
  let setup_action = query.setup_action

  const team = await Team.findOne({ where: { id: team_id } })

  if (!team) {
    res.end('Could not find team!')
    return;
  }

  if (setup_action === 'install') {
    team.githubConnected = true
    await team.save()

    const data = await createInstallationToken(installation_id)

    // https://developer.github.com/v3/apps/installations/#list-repositories
    let resRepos = await axios.get(`https://api.github.com/installation/repositories`, { headers: { 'Accept': 'application/vnd.github.machine-man-preview+json', 'Authorization': `token ${data.token}` } })
    let repos = (resRepos.data as Octokit.AppsListInstallationReposForAuthenticatedUserResponse).repositories

    assert(repos.length > 0, 'Installation has no repos!')

    const owner = GithubOwner.create({
      githubAccessToken: data.token,
      login: repos[0].owner.login,
      installationId: installation_id,
      team: team,
      githubAccessTokenRaw: data as any
    })

    await owner.save()

    for (let repo of repos) {
      const repository = Repository.create({
        githubId: repo.id,
        name: repo.name,
        rawData: repo as any,
        owner: owner
      })

      await repository.save()
    }
    emmit('team.gh.connected', team)
  }
  res.end('done')
} 