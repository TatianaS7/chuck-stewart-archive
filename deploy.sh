#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PROJECT_NAME="chuck-stewart-archive"

usage() {
	cat <<'EOF'
Usage:
	./deploy.sh <scope> <action>

Scopes:
	fullstack | frontend | backend

Actions:
	dev      Start development workflow
	test     Run tests (frontend: Playwright, backend: Vitest)
	lint     Run lint checks
	build    Run production build tasks
	deploy   Run deployment workflow

Examples:
	./deploy.sh fullstack dev
	./deploy.sh frontend test
	./deploy.sh backend deploy
EOF
}

need_cmd() {
	local cmd="$1"
	if ! command -v "$cmd" >/dev/null 2>&1; then
		echo "Missing required command: $cmd"
		exit 1
	fi
}

run_frontend() {
	local action="$1"

	case "$action" in
		dev)
			npm run client
			;;
		test)
			npm run test:e2e
			;;
		lint)
			npx eslint public/react --ext .js,.jsx
			;;
		build)
			npm run build
			;;
		deploy)
			npm run build
			echo "Frontend build created in dist/. Deploy dist/ to your frontend host."
			;;
		*)
			echo "Unsupported frontend action: $action"
			usage
			exit 1
			;;
	esac
}

run_backend() {
	local action="$1"

	case "$action" in
		dev)
			npm run server
			;;
		test)
			npm run test:server
			;;
		lint)
			npx eslint server server.js --ext .js
			;;
		build)
			echo "Backend uses Node runtime (no compile step)."
			;;
		deploy)
			if command -v pm2 >/dev/null 2>&1; then
				pm2 startOrReload ecosystem.config.js --env production
				echo "Backend deployed via PM2."
			else
				echo "PM2 not found. Starting backend directly..."
				npm run server
			fi
			;;
		*)
			echo "Unsupported backend action: $action"
			usage
			exit 1
			;;
	esac
}

run_fullstack() {
	local action="$1"

	case "$action" in
		dev)
			npm run start
			;;
		test)
			run_backend test
			run_frontend test
			;;
		lint)
			run_backend lint
			run_frontend lint
			;;
		build)
			run_backend build
			run_frontend build
			;;
		deploy)
			run_frontend deploy
			run_backend deploy
			;;
		*)
			echo "Unsupported fullstack action: $action"
			usage
			exit 1
			;;
	esac
}

main() {
	need_cmd npm
	need_cmd npx

	local scope="${1:-}"
	local action="${2:-}"

	if [[ -z "$scope" || -z "$action" ]]; then
		usage
		exit 1
	fi

	case "$scope" in
		frontend)
			run_frontend "$action"
			;;
		backend)
			run_backend "$action"
			;;
		fullstack)
			run_fullstack "$action"
			;;
		*)
			echo "Unsupported scope: $scope"
			usage
			exit 1
			;;
	esac
}

main "$@"
