const port = process.env.PORT || 3000
const morgan = require('morgan')

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

app.post('/post', function(request, response) {
  response.send(request.body)
})
