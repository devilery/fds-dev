#!/bin/bash

set -e # abort script on error
# set -o xtrace # debug

URL=https://git.heroku.com/happyship-prod.git
GH_REPO=devilery/fds-dev
REMOTE_NAME=prod

usage() {
	echo "$1 [parameters]"
	echo
	echo "Parameters:"
	echo -e "\t --help \t This help message"
	echo -e "\t --force\t Skip safety checks"
}

deploy() {
	echo -e "✨ Pushing to remote '$REMOTE_NAME' ...\n"

	git push $REMOTE_NAME master:master

	echo -e '\n✅ Deployment done'
}

run() {
	local local_commit remote_commit remote

	remote=`git remote get-url "$REMOTE_NAME"`

	[ -z "$remote" ] && echo "Git remote '$REMOTE_NAME' not set" && \
		echo "Point a git remote '$REMOTE_NAME' to Heroku application remote" return

	local_commit=`git log --format='%H' master | head -n1`
	remote_commit=`git ls-remote $REMOTE_NAME | head -n1 | awk '{print $1}'`

	echo
	echo -e "\tLocal commit: $local_commit"
	echo -e "\tRemote commit ($REMOTE_NAME): $remote_commit"
	echo -e "\tGitHub Diff: https://github.com/$GH_REPO/compare/$remote_commit...$local_commit"
	echo

	[ "$1" == "--force" ] && echo '⚠️ Force detected' && deploy && return

	[ $local_commit == $remote_commit ] && echo '🚨 Commits are the same. Aborting deploy. Use --force to skip.' && return

	# --is-ancestor         is the first one ancestor of the other?
	git merge-base --is-ancestor $remote_commit $local_commit && deploy && return

	echo "Commit $remote_commit is not an ancestor commit of $local_commit. Aborting deploy. Use --force to skip."
}

[ "$1" == "--help" ] && usage "$0" && exit

run "$1"
