# fds-dev
Feature delivery streamlining

## Install
- `yarn install` # download deps

## Development
### run server
- `yarn dev` # nodemon reload on *.js changes

### SSL webhooks and serveo
Some webhooks might require HTTPS (e.g. [Slack interactive endpoint](https://api.slack.com/interactivity/actions)).
Use our private [Serveo](http://serveo.net/) instance in this case:
Execute:
- `ssh -R 80:localhost:3000 serveo.lab.9roads.red -p 23`
Your domain is now prited (e.g. https://vestri.serveo.lab.9roads.red)
Unfortunately you have to **use port 444** on this domain (e.g. https://vestri.serveo.lab.9roads.red:444/)


## Deploy
- `git push origin master` # heroku picks up any changes and deploys
### Manual Deploy
- `heroku git:remote -a fds-dev` # add heroku remote
- `git push heroku master`

change
