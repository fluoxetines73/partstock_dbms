$ErrorActionPreference = 'Stop'
$taskRepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$taskTemplate = Join-Path $taskRepoRoot '.env.docker.example'
$taskEnvFile = Join-Path $taskRepoRoot '.env.docker'
$taskKeyDir = Join-Path $taskRepoRoot '.mongodb'
$taskKeyFile = Join-Path $taskKeyDir 'keyfile'

function New-LocalPassword {
    $taskBytes = New-Object byte[] 24
    $taskRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $taskRng.GetBytes($taskBytes) } finally { $taskRng.Dispose() }
    return ([BitConverter]::ToString($taskBytes)).Replace('-', '').ToLowerInvariant()
}

if (-not (Test-Path -LiteralPath $taskEnvFile)) {
    $taskContent = [System.IO.File]::ReadAllText($taskTemplate)
    foreach ($taskName in @(
        'APP_MYSQL_PASSWORD', 'APP_MYSQL_ROOT_PASSWORD',
        'LAB_MYSQL_PASSWORD', 'LAB_MYSQL_ROOT_PASSWORD',
        'MONGO_ROOT_PASSWORD', 'MONGO_LAB_PASSWORD'
    )) {
        $taskContent = $taskContent.Replace("__${taskName}__", (New-LocalPassword))
    }
    [System.IO.File]::WriteAllText($taskEnvFile, $taskContent, [System.Text.Encoding]::ASCII)
    Write-Host 'Created .env.docker with separate local passwords. Do not commit this file.'
} else {
    Write-Host 'Kept existing .env.docker unchanged.'
}

if (-not (Test-Path -LiteralPath $taskKeyFile)) {
    [System.IO.Directory]::CreateDirectory($taskKeyDir) | Out-Null
    $taskKeyBytes = New-Object byte[] 756
    $taskRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $taskRng.GetBytes($taskKeyBytes) } finally { $taskRng.Dispose() }
    [System.IO.File]::WriteAllText(
        $taskKeyFile, [Convert]::ToBase64String($taskKeyBytes), [System.Text.Encoding]::ASCII
    )
    Write-Host 'Created .mongodb/keyfile. Do not commit this file.'
} else {
    Write-Host 'Kept existing .mongodb/keyfile unchanged.'
}

Write-Host 'Preparation complete. This script does not install or start Docker.'
