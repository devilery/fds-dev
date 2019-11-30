require('dotenv').config()

const port = process.env.PORT || 3000
const morgan = require('morgan')

require('./subscribers/subscribe-events.js')();

var express = require('express')
var app = express()
app.use(express.json())
app.use(morgan('dev'))

app.listen(port, err => {
  if (err) throw err
  console.log(`> Ready on server http://localhost:${port}`)
})

app.get('/', (req, res) => {
  res.send('ExpressJS server is online.')
})

app.get('/get', (req, res, next) => {
  res.json({
    lol: 'rofl'
  })
})

app.post('/api/slack-oauth-webhook', require('./api/slack-oauth-webhook.js'));
app.post('/api/github-webhook', require('./api/github-webhook.js'));
app.post('/api/event-webhook', require('./api/event-webhook.js'));
