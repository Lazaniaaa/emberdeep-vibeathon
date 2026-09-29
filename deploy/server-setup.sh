#!/bin/bash
# Paste this into Vultr's "Cloud-Init User-Data" (or a boot Startup Script) when you create the server.
# It installs Caddy and serves /var/www/emberdeep, a link to the newest release, at a free HTTPS address
# like 203-0-113-5.sslip.io. Ubuntu 22.04 or 24.04. Runs once, as root, on first boot.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

# Every upload goes into its own folder; the site is a link to the newest one, so a broken upload never goes live.
mkdir -p /var/www/emberdeep-releases/initial
echo '<!doctype html><title>Emberdeep</title><p>Server is ready. Upload the build with deploy/deploy.sh.</p>' > /var/www/emberdeep-releases/initial/index.html
ln -sfn /var/www/emberdeep-releases/initial /var/www/emberdeep

IP="$(curl -4fsS https://ifconfig.me || curl -4fsS https://api.ipify.org)"
SITE="${IP//./-}.sslip.io"

cat > /etc/caddy/Caddyfile <<CADDY
${SITE} {
	root * /var/www/emberdeep
	encode zstd gzip
	file_server

	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}
	# Hashed build files never change; the map art keeps its name, so it is cached for a day.
	@hashed path /assets/*
	header @hashed Cache-Control "public, max-age=31536000, immutable"
	@maps path /maps/*
	header @maps Cache-Control "public, max-age=86400"
	@page path / /index.html
	header @page Cache-Control "no-cache"
}
CADDY

# Vultr Ubuntu images ship with UFW allowing only SSH.
if command -v ufw >/dev/null 2>&1; then
	ufw allow 80/tcp
	ufw allow 443/tcp
fi

systemctl enable caddy
systemctl restart caddy
echo "Emberdeep will be served at https://${SITE}" > /root/emberdeep-url.txt
