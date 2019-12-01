var admin = require('firebase-admin');

module.exports = function() {
  const app = admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_AUTH_JSON)),
    databaseURL: "https://fds-dev-260620.firebaseio.com"
  });
  return app
}()

