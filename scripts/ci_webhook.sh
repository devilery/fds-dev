#!/bin/sh

URL=https://fds-dev.herokuapp.com/api/event-webhook

ci_webhook() {
	# $1 = event type; $2 = any extra JSON string
	echo Sending webhook ...
	# Send all CIRCLE* env vars
	curl -X POST "$URL" \
	  -H "Content-Type: application/json" \
	  -d"{`env | grep CIRCLE | sed 's/=/":"/' | sed 's/\(.*\)/"\1",/'` \"type\":\"$1\"$2}" #  pipeline.finished
}

[ ! -z "$1" ] && ci_webhook "$1" "$2"
