#!/bin/bash

# Start both backend and frontend concurrently
# Run this from the root directory

echo "🚀 Starting SolPay Data Oracle..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "✗ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if backend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "Starting services..."
echo "📡 Backend (Oracle Server): http://localhost:3402"
echo "🌐 Frontend (Web UI): http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Start backend in background
npm start &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 5

# Start frontend
cd frontend
npm run dev
