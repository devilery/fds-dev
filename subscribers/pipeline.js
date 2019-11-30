async started(data) {
	console.log('started');
	console.log(data);
}

async finished(data) {
	console.log('finished');
	console.log(data);
}

module.exports = {
	'started': started,
	'finished': finished
}