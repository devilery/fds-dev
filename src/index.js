require('dotenv').config();

const port = process.env.PORT || 3000;

const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const express = require('express');
const { subscribe } = require('./libs/event.js');

const app = express();
app.use(express.json());
app.use(morgan('dev'));


app.get('/ping', (req, res, next) => {
  res.send('pong').end();
});


const apiPath = path.join(__dirname, 'api');
fs.readdirSync(apiPath)
  .filter(file => { return (file.slice(-3) === '.js'); })
  .forEach(file => {
    let baseRoute = `/api/${path.basename(file).split('.').slice(0, -1).join('.')}`;
    let router = require(path.join(apiPath, file));
    app.use(baseRoute, router);
  });


const subscribersPath = path.join(__dirname, 'subscribers');
fs.readdirSync(subscribersPath)
  .filter(file => { return (file.slice(-3) === '.js'); })
  .forEach(file => {
  	subscribe();
  	let subscribers = require(path.join(subscribersPath, file)).forEach(subscriber => {
  		subscribe(subscriber.eventType,  subscriber);
  	});
  });


app.listen(port, err => {
  if (err) throw err
  console.log(`> Ready on server http://localhost:${port}`)
});