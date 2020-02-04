// @ts-ignore
import assert from '../../../libs/assert';
import url from 'url';
import { Team, GithubOwner, Repository } from '../../../entity'
import { createInstallationToken, getInstallationRepos, getInstallationInfo } from '../../../libs/github-api';
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
    let installInfo = await getInstallationInfo(installation_id)

    const owner = await GithubOwner.updateOrCreate({ login: installInfo.account.login }, {
      githubAccessToken: data.token,
      login: installInfo.account.login,
      installationId: installation_id,
      githubAccessTokenRaw: data as any
    })

    team.githubOwner = owner
    team.githubConnected = true
    await team.save()

    res.statusCode = 302
    res.setHeader('location', `${config.authRedirectUrls.githubInstall}`)
    res.end()

    emmit('team.gh.connected', team)

    // use second endpoint to get repos. Not all of them will be in first response.........
    let repos = await getInstallationRepos(owner.githubAccessToken)
    for (let repo of repos) {
      await Repository.updateOrCreate({ githubId: repo.id }, {
        githubId: repo.id,
        name: repo.name,
        rawData: repo as any,
        websiteUrl: repo.html_url,
        owner: owner
      })
    }

  } else {
    res.statusCode = 302
    res.setHeader('location', `${config.authRedirectUrls.githubInstall}`)
    res.end()
  }
}
