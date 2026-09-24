# Run from any directory. Local preview only; production settings are untouched.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$localDir = Join-Path $PSScriptRoot '.local'
New-Item -ItemType Directory -Path $localDir -Force | Out-Null
$keyPath = Join-Path $localDir 'paper-preview-jwt.key'
if (-not (Test-Path -LiteralPath $keyPath)) {
    [IO.File]::WriteAllText($keyPath, ([Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')))
}
$env:SPRING_APPLICATION_JSON = @{ jwt = @{ secret = [IO.File]::ReadAllText($keyPath).Trim() } } | ConvertTo-Json -Compress
$envFile = Join-Path $PSScriptRoot '../.env.local'
if (Test-Path -LiteralPath $envFile) {
    Get-Content -LiteralPath $envFile | ForEach-Object {
        if ($_ -match '^\s*(KIS_APP_KEY|KIS_APP_SECRET)\s*=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim().Trim('"').Trim("'"), 'Process')
        }
    }
}
& .\mvnw.cmd -q spring-boot:run '-Dspring-boot.run.useTestClasspath=true' '-Dspring-boot.run.arguments=--spring.config.location=classpath:/application.yml --server.port=18081 --spring.datasource.url=jdbc:h2:file:./.local/paper-preview;DB_CLOSE_ON_EXIT=FALSE --spring.datasource.driver-class-name=org.h2.Driver --spring.datasource.username=sa --spring.datasource.password= --spring.jpa.hibernate.ddl-auto=update --jwt.access-token-expiration-ms=3600000 --turnstile.secret-key='
exit $LASTEXITCODE
