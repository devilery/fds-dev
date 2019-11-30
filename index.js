const express = require('express');
const app = express();
const port = 3000;
const glob = require('glob');
const path = require('path');

require('./subscribers/subscribe-events.js')();

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
