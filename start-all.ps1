# Start both backend and frontend concurrently
# Run this from the root directory

Write-Host "🚀 Starting SolPay Data Oracle..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if backend dependencies are installed
if (-Not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if frontend dependencies are installed
if (-Not (Test-Path "frontend/node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host "📡 Backend (Oracle Server): http://localhost:3402" -ForegroundColor Green
Write-Host "🌐 Frontend (Web UI): http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Start backend in background
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -PassThru -WindowStyle Minimized

# Wait for backend to be ready
Start-Sleep -Seconds 5

# Start frontend in current terminal
cd frontend
npm run dev
