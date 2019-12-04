var Libhoney = require("libhoney");

// https://docs.honeycomb.io/getting-data-in/javascript/sdk/
var honeycomb = new Libhoney({
  writeKey: process.env.HONEYCOMB_KEY || 'bddebcfdbb47c561be0f7615d7c05722',
  dataset: process.env.HONEYCOMB_DATASET || 'events-dev',
});

function trackEvent(name, props = {}) {
  if (!name) {
    throw 'Missing event name';
  }

  honeycomb.sendNow({
    event: name,
    ...props,
  });
}

module.exports = { honeycomb, trackEvent };
