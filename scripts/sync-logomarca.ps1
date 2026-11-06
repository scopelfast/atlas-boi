# Copia logomarcas de logomarca/ para frontend/public/logomarca/
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root "logomarca"
$dst = Join-Path $root "frontend\public\logomarca"

if (-not (Test-Path $src)) {
    Write-Error "Pasta nao encontrada: $src"
    exit 1
}

New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "$src\*.png" $dst -Force
Copy-Item "$src\atlas-boi-retangular.png" (Join-Path $root "frontend\app\icon.png") -Force
Copy-Item "$src\atlas-boi-retangular.png" (Join-Path $root "frontend\app\apple-icon.png") -Force

Write-Host "Logomarca sincronizada -> $dst"
Write-Host "Oficial: atlas-boi-retangular.png"
