const events = {};

function subscribe(eventName, callback) {
	let callbacks = events[eventName];
	if (callbacks === undefined) {
		events[eventName] = [callback];
	}
};

async function emmit(eventName, data) {
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