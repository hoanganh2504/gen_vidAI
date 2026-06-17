if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker is not installed or not available in PATH." -ForegroundColor Red
    exit 1
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Desktop is not running. Please open Docker Desktop first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example. Please fill your API keys, then run this script again." -ForegroundColor Yellow
    exit 0
}

if (Test-Path ".\food-video-ai-demo.tar") {
    Write-Host "Loading Docker image..."
    docker load -i ".\food-video-ai-demo.tar"
}

New-Item -ItemType Directory -Force -Path ".\data\videos" | Out-Null
New-Item -ItemType Directory -Force -Path ".\data\mock" | Out-Null

docker compose -f docker-compose.release.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Food AI Video Generator is running:" -ForegroundColor Green
    Write-Host "http://127.0.0.1:8000" -ForegroundColor Cyan
}
