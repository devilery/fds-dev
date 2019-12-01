const { fdsApp } = require('./index')
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.log('App was loaded!')

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/

  // API Docs: https://octokit.github.io/rest.js/#usage

  app.on('issues.opened', async context => {
    const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
    // Deprecation: [@octokit/rest] "number" parameter is deprecated for ".issues.createComment()". Use "issue_number" instead
    return context.github.issues.createComment({...issueComment, issue_number: issueComment.number})
  })

  app.on(`*`, async context => {
    context.log({ event: context.event, action: context.payload.action })
  })

  fdsApp(app.route('/fds'))
}
