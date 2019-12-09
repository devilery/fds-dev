# fds-dev
Feature delivery streamlining

## Install
- `yarn install` # download deps

## Development
- `yarn dev` # nodemon reload on *.js changes

## Deploy
- `git push origin master` # heroku picks up any changes and deploys
### Manual Deploy
- `heroku git:remote -a fds-dev` # add heroku remote
- `git push heroku master`
sadfasddd
### example .env File
FIREBASE_AUTH_JSON=
GITHUB_API_TOKEN=
CIRCLE_TOKEN=
APP_ID=
GH_APP_INSTAL_URL=https://example.com/apps/devilery-app-test-3/installations/new
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
APP_BASE_URL=https://example.com
GITHUB_APP_PUBLIC_KEY=
GITHUB_APP_SECRET_KEY=
GITHUB_OAUTH_BASE_URL=https://example.com/
GITHUB_PRIVATE_KEY=
SLACK_OAUTH_REDIRECT_URI=https://example.com/api/slack-oauth-webhook
WEBHOOK_SECRET=
SLACK_SIGNING_SECRET=
TYPEORM_CONNECTION=postgres
TYPEORM_HOST=localhost
TYPEORM_USERNAME=devilery
TYPEORM_PASSWORD=devilery
TYPEORM_DATABASE=devilery
TYPEORM_PORT=5432
TYPEORM_SYNCHRONIZE=true
TYPEORM_LOGGING=true
