const axios = require('axios')

async function retryBuild({vcs, username, project, build_num}) {
	const url = `https://circleci.com/api/v1.1/project/${vcs}/${username}/${project}/${build_num}/retry?circle-token=${process.env.CIRCLE_TOKEN}`
	console.log(url, vcs, username, project, build_num, process.env.CIRCLE_TOKEN);
	let res = await axios.post(url)
	console.log(res);
    // let data = await res.json()
    // console.log(data);
}

module.exports = {
  retryBuild
}
