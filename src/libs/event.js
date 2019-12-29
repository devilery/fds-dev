const events = {};

function subscribe(eventName, callback) {
	let callbacks = events[eventName];
	if (callbacks === undefined) {
		events[eventName] = [callback];
	}
};

async function emmit(eventName, data) {
	if (process.env.LOG_EVENTS) {
		console.log('[emit]', eventName, data)
	}

	let callbacks = events[eventName];
	if (callbacks === undefined) {
		callbacks = []
	}

	callbacks.forEach(callback => {
		callback(data);
	});
};

module.exports = {
	'subscribe': subscribe,
	'emmit': emmit
}

export { emmit, subscribe }
