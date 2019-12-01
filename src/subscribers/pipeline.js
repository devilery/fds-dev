const started = async function(data) {
	console.log('started');
	console.log(data);
}
started.eventType = 'pipeline.started';

const finished = async function(data) {
	console.log('finished');
	console.log(data);
}
started.eventType = 'pipeline.finished';

module.exports = [started, finished];