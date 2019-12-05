const { getUserInfo } = require('./circleci');
const { firestore } = require('./firebase');


async function saveToken(teamId, token) {
  await firestore.collection('teams').doc(teamId).update({circle_personal_token: token})
}


async function handleCommands(req, res) {
	if (req.body.command === '/circle') {
    const { body } = req;
    if (body.text && body.text.match(/\w+/)) {
    	const token = body.text;

      let data;
      try {
      	data = await getUserInfo(token)
      } catch(e) {}

      if (data && body.team_id) {
      	// { 'user-agent': 'Slackbot 1.0 (+https://api.slack.com/robots)','accept-encoding': 'gzip,deflate',accept: 'application/json,*/*','x-slack-signature': 'v0=e62005e84c53d934d0851fa53fcbc08a22985f1d190214f5b4fc844e94fbb791','x-slack-request-timestamp': '1575499389','content-length': '389','content-type': 'application/x-www-form-urlencoded',host: 'office.9roads.red:3001','cache-control': 'max-age=259200',connection: 'keep-alive' } { token: 'NaJvdcalqPy9uttLRt36izTd',team_id: 'T072R1FNG',team_domain: '9roads',channel_id: 'DR5AH2CCV',channel_name: 'directmessage',user_id: 'U072UCFH8',user_name: 'tomas',command: '/circle',text: '1c5bc253ba18d0be9b3dc901b4eb6d91840c3c26',response_url: 'https://hooks.slack.com/commands/T072R1FNG/862252336759/7vqYkfmohVaMfrkfYtcsUhHy',trigger_id: '862252336823.7093049764.72f68083c1ccbb7b058774422913f321' }
        // c(data)
        // res.send(`Thanks ${data.name}! We have tested your token and it works! :tada: You will have more info about your pipeline now :muscle:`).end()

        saveToken(body.team_id, token)

        res.send({
        	"text": `Thanks! We have tested your token and it works! :tada: You will have more info about your pipeline now :muscle:`,
        	"attachments": [
	        {
	        	// "text": `Thanks! We have tested your token and it works! :tada: You will have more info about your pipeline now :muscle:`,
            "fallback": `token issued by ${data.name}`,
            // "image_url": "https://avatars0.githubusercontent.com/u/140393?v=4",
            // "thumb_url": "https://avatars0.githubusercontent.com/u/140393?v=4",
            // "footer_icon": "https://avatars0.githubusercontent.com/u/140393?v=4",
            "author_name": `token issued by ${data.name}`,
            "author_icon": "https://avatars0.githubusercontent.com/u/140393?v=4",
	        }
		    ]}).end()
      } else {
        res.send('Sorry, we tried but could not verify this token. :man-shrugging: Please try again later.').end();
      }
    } else {
      res.send('that does not look like token to me').end()
    }
  } else {
    res.send(`Unkown command ${req.body.command} :(`).end()
  }
}

module.exports = { handleCommands }
