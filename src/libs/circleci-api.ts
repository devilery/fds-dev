import axios from 'axios';
const CIRCLE_BASE = 'https://circleci.com/api/v1.1/project';
const CIRCLE_BASE_v2 = 'https://circleci.com/api/v2';
const CIRCLE_TOKEN = process.env.CIRCLE_TOKEN;

const session = axios.create()

session.interceptors.response.use(response => response, (error) => {
	const apiError = new CircleCiApiError(`Api error: ${error.message} on url: ${error.request?.path}`, error)
	return Promise.reject(apiError);
});

export async function retryBuild({vcs, username, project, build_num}) {
	const url = `${CIRCLE_BASE}/${vcs}/${username}/${project}/${build_num}/retry?circle-token=${CIRCLE_TOKEN}`
	let res = await session.post(url)
  return res;
}

// https://circleci.com/gh/feature-delivery/fds-dev/86?utm_campaign=vcs-integration-link&utm_medium=referral&utm_source=github-build-link
// job can be in any state: pending, success, fail
export async function jobDetails({jobUrl, token}) {
	// const url = `https://circleci.com/api/v1.1/project/gh/feature-delivery/fds-dev/54`
	const url = `${CIRCLE_BASE}/${jobUrl.replace('https://circleci.com/', '')}?circle-token=${token}`
	const res = await session.get(url)

	const output = {} as {
		raw_job_data: any,
		estimate_ms: number,
		workflow: any
	};

	if (res.data) {
		output.raw_job_data = res.data;
		// previous_successful_build: { build_num: 53, status: 'success', build_time_millis: 3350 },
		// TODO: prvioud build in workflows is just the previous job :facepalm:
		const estimateMs = res.data.previous_successful_build.build_time_millis;

		output.estimate_ms = estimateMs;

		// res.data.steps.forEach(s => console.log(s))

		//   workflows: { job_name: 'track_end',     job_id: 'ba31d462-c692-45e2-afaa-0dfe4cd90c56',     workflow_id: 'e0fea775-1230-4aef-8f8b-7f2bd270bb7a',     workspace_id: 'c84f306c-2a06-4af9-bd53-c727d48ac07d',     upstream_job_ids:      [ '77cee595-ff1f-44f4-9525-d11c25f8e85d',        'eb576787-1ce1-4192-a059-edc35408abfc',        '481c6140-fee9-47fc-afbc-bbaea5e5da4f',        '9c9ad4eb-3b25-4b9c-92a9-e37adeb9ef0c' ],     upstream_concurrency_map: {},     workflow_name: 'pipeline' },
		const wid = res.data.workflows.workflow_id;
		//console.log(wid);
		const wfData = await workflowDetails({workflowId: wid, token});
		output.workflow = wfData;
	}

	return output;
}

export async function workflowDetails({ workflowId, token }) {
	const wurl = `${CIRCLE_BASE_v2}/workflow/${workflowId}/job?circle-token=${token}`;
	const wres = await session.get(wurl)

	const output = {};

	if (wres.data) {
		output.raw_workflow_job_data = wres.data;
		const allOnHold = wres.data.items.filter(i => i.status == 'on_hold');
		output.jobs_on_hold = allOnHold;
	}

	return output;
}

export async function getUserInfo(token) {
	// { "enrolled_betas": ["top-bar-ui-v-1"], "in_beta_program": false, "selected_email": "...", "avatar_url": "https://avatars0.githubusercontent.com/u/140393?v=4", "trial_end": "2015-05-15T00:37:21.145Z", "admin": false, "basic_email_prefs": "none", "sign_in_count": 61, "github_oauth_scopes": ["user:email", "repo"], "analytics_id": "bb136cb4-ad4e-4a81-b04b-c6005afa48db", "name": "Tomas Ruzicka", "gravatar_id": null, "first_vcs_authorized_client_id": null, "days_left_in_trial": -1664, "privacy_optout": false, "parallelism": 1, "student": false, "bitbucket_authorized": false, "github_id": 140393, "web_ui_pipelines_optout": "opted-out", "bitbucket": null, "dev_admin": false, "all_emails": ["....", "...", "...", "...@gmail.com"], "created_at": "2015-05-01T00:37:21.145Z", "plan": null, "heroku_api_key": null, "identities": { "github": { "avatar_url": "https://avatars0.githubusercontent.com/u/140393?v=4", "external_id": 140393, "id": 140393, "name": "Tomas Ruzicka", "user?": true, "domain": "github.com", "type": "github", "authorized?": true, "provider_id": "bcc68be8-ef10-4dd6-9b76-34f19e0db930", "login": "LeZuse" } }, "projects": { "https://github.com/productboard/pb-backend": { "on_dashboard": true, "emails": "default" }, "https://github.com/productboard/pb-extension": { "on_dashboard": true, "emails": "default" }, "https://github.com/productboard/pb-integrations": { "on_dashboard": true, "emails": "default" }, "https://github.com/productboard/pb-frontend": { "on_dashboard": true, "emails": "default" }, "https://github.com/devilery/fds-dev": { "on_dashboard": true, "emails": "default" } }, "login": "LeZuse", "organization_prefs": {}, "containers": 1, "pusher_id": "7ed4403b6c5827056e228d2acf958dbac49ece45", "web_ui_pipelines_first_opt_in": true, "num_projects_followed": 5 }
	const url = `https://circleci.com/api/v1.1/me?circle-token=${token}`
	// console.log(url);
	const res = await session.get(url)

	if (res.data) {
		return res.data;
	}
}


class CircleCiApiError extends Error {
	original?: Error;
	new_stack?: string;

	constructor(message: string, error?: Error) {
		super(message);
		this.name = this.constructor.name;
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, this.constructor);
		} else {
			this.stack = (new Error(message)).stack;
		}

		if (error && this.stack) {
			this.original = error;
			this.new_stack = this.stack
			let message_lines = (this.message.match(/\n/g) || []).length + 1
			this.stack = this.stack.split('\n').slice(0, message_lines + 1).join('\n') + '\n' + error.stack
		}
	}
}