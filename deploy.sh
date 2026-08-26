#!/usr/bin/env bash
# Pulls the latest code and restarts the live service. Run this on the
# server, from anywhere, after pushing changes:
#   ~/projects/dadjokes/deploy.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="dadjokes"

echo "==> Pulling latest code"
cd "$REPO_DIR"
git pull

echo "==> Installing dependencies"
source venv/bin/activate
pip install -r req.txt
npm install

echo "==> Building CSS"
npm run build:css

echo "==> Applying migrations"
python manage.py migrate

echo "==> Collecting static files"
python manage.py collectstatic --noinput

echo "==> Restarting $SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

echo "==> Status"
sudo systemctl status "$SERVICE_NAME" --no-pager
