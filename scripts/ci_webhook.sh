#!/bin/sh

URL=https://fds-dev.now.sh/api/event-webhook

send() {
	echo Sending webhook ...
	# Send all CIRCLE* env vars
	curl -X POST "$URL" \
	  -H "Content-Type: application/json" \
	  -d"{`env | grep CIRCLE | sed 's/=/":"/' | sed 's/\(.*\)/"\1",/'` \"type\":\"$1\"}" #  pipeline.finished
}

[ ! -z "$1" ] && send "$1"
