// @ts-ignore
import assert from '../../../libs/assert';
import url from 'url';
import { Team, GithubOwner, Repository } from '../../../entity'
import { createInstallationToken } from '../../../libs/github-api';
import axios from 'axios';
import config from '../../../config';
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
    const data = await createInstallationToken(installation_id)

    // https://developer.github.com/v3/apps/installations/#list-repositories
    let resRepos = await axios.get(`https://api.github.com/installation/repositories`, { headers: { 'Accept': 'application/vnd.github.machine-man-preview+json', 'Authorization': `token ${data.token}` } })
    let repos = (resRepos.data as Octokit.AppsListInstallationReposForAuthenticatedUserResponse).repositories

    assert(repos.length > 0, 'Installation has no repos!')

    const owner = await GithubOwner.updateOrCreate({ login: repos[0].owner.login }, {
      githubAccessToken: data.token,
      login: repos[0].owner.login,
      installationId: installation_id,
      githubAccessTokenRaw: data as any
    })

    team.githubOwner = owner
    team.githubConnected = true
    await team.save()

    for (let repo of repos) {
      await Repository.updateOrCreate({ githubId: repo.id }, {
        githubId: repo.id,
        name: repo.name,
        rawData: repo as any,
        websiteUrl: repo.html_url,
        owner: owner
      })

    }
    emmit('team.gh.connected', team)
  }

  res.statusCode = 302
  res.setHeader('location', `${config.authRedirectUrls.githubInstall}`)
  res.end()
}
