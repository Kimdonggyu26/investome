$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:VITE_API_BASE_URL = 'http://localhost:18081'
$env:VITE_TURNSTILE_SITE_KEY = ''
& npm.cmd run dev -- --host 127.0.0.1 --port 5176 --strictPort
exit $LASTEXITCODE
