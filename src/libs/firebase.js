var admin = require('firebase-admin');

const app = admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_AUTH_JSON)),
  databaseURL: "https://fds-dev-260620.firebaseio.com"
});

const firestore = app.firestore()


module.exports = { firestore }
