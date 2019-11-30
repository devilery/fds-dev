async function started(data) {
	console.log('started');
	console.log(data);
}

async function finished(data) {
	console.log('finished');
	console.log(data);
}

module.exports = {
	'started': started,
	'finished': finished
}