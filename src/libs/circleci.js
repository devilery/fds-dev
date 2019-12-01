const axios = require('axios')
const CIRCLE_BASE = 'https://circleci.com/api/v1.1/project';
const CIRCLE_BASE_v2 = 'https://circleci.com/api/v2';
const CIRCLE_TOKEN = process.env.CIRCLE_TOKEN;

async function retryBuild({vcs, username, project, build_num}) {
	const url = `${CIRCLE_BASE}/${vcs}/${username}/${project}/${build_num}/retry?circle-token=${CIRCLE_TOKEN}`
	console.log(url, vcs, username, project, build_num, CIRCLE_TOKEN);
	let res = await axios.post(url)
	// console.log(res);
    // let data = await res.json()
    // console.log(data);
    return res;
}

// https://circleci.com/gh/feature-delivery/fds-dev/86?utm_campaign=vcs-integration-link&utm_medium=referral&utm_source=github-build-link
// job can be in any state: pending, success, fail
async function jobDetails({jobUrl}) {
	// const url = `https://circleci.com/api/v1.1/project/gh/feature-delivery/fds-dev/54`
	const url = `${CIRCLE_BASE}/${jobUrl.replace('https://circleci.com/', '')}?circle-token=${CIRCLE_TOKEN}`
	console.log(url);
	const res = await axios.get(url)
	console.log(res.data);

	const output = {};

	if (res.data) {
		output.raw_job_data = res.data;
		// previous_successful_build: { build_num: 53, status: 'success', build_time_millis: 3350 },
		// TODO: prvioud build in workflows is just the previous job :facepalm:
		const estimateMs = res.data.previous_successful_build.build_time_millis;

		output.estimate_ms = estimateMs;

		// res.data.steps.forEach(s => console.log(s))

		//   workflows: { job_name: 'track_end',     job_id: 'ba31d462-c692-45e2-afaa-0dfe4cd90c56',     workflow_id: 'e0fea775-1230-4aef-8f8b-7f2bd270bb7a',     workspace_id: 'c84f306c-2a06-4af9-bd53-c727d48ac07d',     upstream_job_ids:      [ '77cee595-ff1f-44f4-9525-d11c25f8e85d',        'eb576787-1ce1-4192-a059-edc35408abfc',        '481c6140-fee9-47fc-afbc-bbaea5e5da4f',        '9c9ad4eb-3b25-4b9c-92a9-e37adeb9ef0c' ],     upstream_concurrency_map: {},     workflow_name: 'pipeline' },
		const wid = res.data.workflows.workflow_id;
		console.log(wid);
		const wfData = await workflowDetails({workflowId: wid});
		output.workflow = wfData;
	}

	return output;
}

async function workflowDetails({workflowId}) {
	const wurl = `${CIRCLE_BASE_v2}/workflow/${workflowId}/job?circle-token=${CIRCLE_TOKEN}`
	const wres = await axios.get(wurl)
	console.log(wres.data);

	const output = {};

	if (wres.data) {
		output.raw_workflow_job_data = wres;
		wres.data.items.forEach(i => console.log(i.name, i.status))

		const allOnHold = wres.data.items.filter(i => i.status == 'on_hold');
		console.log(allOnHold);

		output.jobs_on_hold = allOnHold;
	}

	return output;
}

module.exports = {
  retryBuild,
  jobDetails,
}
