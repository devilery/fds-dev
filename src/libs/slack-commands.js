const { getUserInfo } = require('./circleci');

async function handleCommands(req, res) {
	if (req.body.command === '/circle') {
    const { body } = req;
    if (body.text && body.text.match(/\w+/)) {
      console.log('got token', body.text);

      let data;
      try {
      	data = await getUserInfo(body.text)
      } catch(e) {}

      if (data) {
        console.log(data);
        // res.send(`Thanks ${data.name}! We have tested your token and it works! :tada: You will have more info about your pipeline now :muscle:`).end()
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
