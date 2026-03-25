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

is_port_in_use() {
	local port="$1"
	node -e "
const net = require('net');
const port = Number(process.argv[1]);
const server = net.createServer();
server.once('error', (error) => {
  if (error && error.code === 'EADDRINUSE') process.exit(0);
  process.exit(2);
});
server.once('listening', () => {
  server.close(() => process.exit(1));
});
server.listen(port, '::');
" "$port"
	local code="$?"
	if [[ "$code" -eq 0 ]]; then
		return 0
	fi
	if [[ "$code" -eq 1 ]]; then
		return 1
	fi

	echo "Unable to check port $port availability."
	exit 1
}

ensure_port_free() {
	local port="$1"
	local service_name="$2"

	if is_port_in_use "$port"; then
		echo "Port $port is already in use."
		echo "The $service_name service cannot start while that port is occupied."
		echo "Stop the existing process on port $port, then rerun: ./deploy.sh fullstack dev"
		exit 1
	fi
}

resolve_python_cmd() {
	if [[ -x "$ROOT_DIR/.venv/Scripts/python.exe" ]]; then
		echo "$ROOT_DIR/.venv/Scripts/python.exe"
		return 0
	fi

	if [[ -x "$ROOT_DIR/server/.venv/Scripts/python.exe" ]]; then
		echo "$ROOT_DIR/server/.venv/Scripts/python.exe"
		return 0
	fi

	if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
		echo "$ROOT_DIR/.venv/bin/python"
		return 0
	fi

	if [[ -x "$ROOT_DIR/server/.venv/bin/python" ]]; then
		echo "$ROOT_DIR/server/.venv/bin/python"
		return 0
	fi

	if command -v python3 >/dev/null 2>&1; then
		echo "python3"
		return 0
	fi

	if command -v python >/dev/null 2>&1; then
		echo "python"
		return 0
	fi

	echo "Missing required command: python3 or python"
	exit 1
}

install_python_requirements() {
	local python_cmd="$1"
	local requirements_file="$ROOT_DIR/server/requirements.txt"
	local cache_dir="$ROOT_DIR/.deploy-cache"
	local requirements_cache="$cache_dir/python-requirements.txt"

	if [[ ! -f "$requirements_file" ]]; then
		echo "Python requirements file not found at server/requirements.txt; skipping dependency install."
		return 0
	fi

	mkdir -p "$cache_dir"

	if [[ -f "$requirements_cache" ]] && cmp -s "$requirements_file" "$requirements_cache"; then
		echo "Python requirements unchanged; skipping dependency install."
		return 0
	fi

	echo "Installing Python dependencies from server/requirements.txt..."
	"$python_cmd" -m pip install --upgrade pip
	"$python_cmd" -m pip install -r "$requirements_file"
	cp "$requirements_file" "$requirements_cache"
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
	local python_cmd

	case "$action" in
		dev)
			ensure_port_free 8000 "API"
			ensure_port_free 5001 "certificate converter"
			python_cmd="$(resolve_python_cmd)"
			install_python_requirements "$python_cmd"
			npx concurrently --kill-others-on-fail --names "api,converter" --prefix-colors "blue,green" \
				"npx cross-env CERTIFICATE_CONVERTER_URL=http://127.0.0.1:5001 npm run server" \
				"$python_cmd server/utils/file-converter.py"
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
			python_cmd="$(resolve_python_cmd)"
			install_python_requirements "$python_cmd"
			if command -v pm2 >/dev/null 2>&1; then
				pm2 startOrReload ecosystem.config.js --env production
				if pm2 describe certificate-converter >/dev/null 2>&1; then
					pm2 restart certificate-converter --update-env
				else
					pm2 start server/utils/file-converter.py --name certificate-converter --interpreter "$python_cmd" --update-env
				fi
				echo "Backend deployed via PM2."
			else
				echo "PM2 not found. Starting backend and converter directly..."
				npx concurrently --kill-others-on-fail --names "api,converter" --prefix-colors "blue,green" \
					"npx cross-env CERTIFICATE_CONVERTER_URL=http://127.0.0.1:5001 npm run server" \
					"$python_cmd server/utils/file-converter.py"
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
	local python_cmd

	case "$action" in
		dev)
			ensure_port_free 8000 "API"
			ensure_port_free 5173 "frontend"
			ensure_port_free 5001 "certificate converter"
			python_cmd="$(resolve_python_cmd)"
			install_python_requirements "$python_cmd"
			npx concurrently --kill-others-on-fail --names "api,web,converter" --prefix-colors "blue,magenta,green" \
				"npx cross-env CERTIFICATE_CONVERTER_URL=http://127.0.0.1:5001 npm run server" \
				"npm run client" \
				"$python_cmd server/utils/file-converter.py"
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
	need_cmd node

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
