const events = {};

function subscribe(eventName, callback) {
	let callbacks = events[eventName]
	if (callbacks === undefined) {
		events[eventName] = [callback]
	}
};

async function emmit(eventName, data) {	
	if (process.env.LOG_EVENTS) {
		process.env.LOG_EVENTS_DATA
 			? console.log('[emit]', eventName, data)
 			: console.log('[emit]', eventName);
	}

	let callbacks = events[eventName];
	if (callbacks === undefined) {
		callbacks = []
	}

	await Promise.all(callbacks.map(async callback => {
		callback(data);
	}))
};

module.exports = {
	'subscribe': subscribe,
	'emmit': emmit
}

export { emmit, subscribe }
