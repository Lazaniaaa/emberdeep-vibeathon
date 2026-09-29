#!/bin/bash
# Builds the game and publishes it to your Vultr server. Run from the project root in Git Bash:
#   bash deploy/deploy.sh 203.0.113.5
# The new build is uploaded to its own folder and checked before the site is switched to it, so a dropped
# connection never leaves the site empty. The four newest releases are kept for clients that are still open.
# It asks for the server's root password (Vultr shows it on the instance page) a few times.
set -euo pipefail
SERVER="${1:?Usage: bash deploy/deploy.sh <server IP> [user]}"
USER_NAME="${2:-root}"
HOST="${USER_NAME}@${SERVER}"

npm run build
test -f dist/index.html

REL="$(ssh "$HOST" 'echo /var/www/emberdeep-releases/$(date +%Y%m%d-%H%M%S)')"
ssh "$HOST" "mkdir -p '$REL'"
scp -r dist/* "$HOST:$REL/"

# Switch only if the upload is complete. A real directory from an older setup is moved aside first.
ssh "$HOST" "set -e
test -f '$REL/index.html' && test -d '$REL/assets'
if [ -d /var/www/emberdeep ] && [ ! -L /var/www/emberdeep ]; then mv /var/www/emberdeep /var/www/emberdeep-releases/previous; fi
ln -sfn '$REL' /var/www/emberdeep
ls -1dt /var/www/emberdeep-releases/* | tail -n +5 | xargs -r rm -rf"

echo
echo "Published $REL"
echo "Open https://${SERVER//./-}.sslip.io (or http://${SERVER} if HTTPS is not ready yet)."
