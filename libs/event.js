const events = [];

function subscribe(eventName, callback) {
	const index = events.indexOf(eventName);
	if (index > 0) {
		event = events[index];
	} else {
		event = {
			'name': eventName,
			'callbacks': []
		}
	}
};

async function emmit(eventName, data) {
	const index = events.indexOf(eventName);
	if (index > 0) {
		event = events[index];
	} else {
		event = {
			'callbacks': []
		}
	}

	event.callbacks.forEach(callback => {
		callback(data)
	});
};

module.exports = {
	'subscribe': subscribe,
	'emmit': emmit
}