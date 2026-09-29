# Builds the game and publishes it to your Vultr server (PowerShell version of deploy.sh).
# Usage from the project root:   .\deploy\deploy.ps1 -Server 203.0.113.5
# Needs the OpenSSH client (Settings -> Apps -> Optional features), or use Git Bash: bash deploy/deploy.sh <IP>
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [string]$User = "root"
)
$ErrorActionPreference = "Stop"

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  throw "ssh was not found. Install OpenSSH Client, or use Git Bash: bash deploy/deploy.sh $Server"
}

npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }
if (-not (Test-Path dist\index.html)) { throw "dist\index.html is missing" }

$target = "$User@$Server"
$rel = (ssh $target 'echo /var/www/emberdeep-releases/$(date +%Y%m%d-%H%M%S)').Trim()
ssh $target "mkdir -p '$rel'"
scp -r dist\* "${target}:${rel}/"
if ($LASTEXITCODE -ne 0) { throw "Upload failed; the live site was not touched" }

ssh $target "set -e; test -f '$rel/index.html' && test -d '$rel/assets'; if [ -d /var/www/emberdeep ] && [ ! -L /var/www/emberdeep ]; then mv /var/www/emberdeep /var/www/emberdeep-releases/previous; fi; ln -sfn '$rel' /var/www/emberdeep; ls -1dt /var/www/emberdeep-releases/* | tail -n +5 | xargs -r rm -rf"
if ($LASTEXITCODE -ne 0) { throw "Switching to the new release failed; the previous one is still live" }

$dashed = $Server -replace "\.", "-"
Write-Host ""
Write-Host "Published $rel"
Write-Host "Open https://$dashed.sslip.io (or http://$Server if HTTPS is not ready yet)."
