#!/bin/bash

echo "🚀 Setting up CryptoTicketing Development Environment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    print_status "Homebrew installed"
else
    print_status "Homebrew already installed"
fi

# Install Node.js
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    brew install node
    print_status "Node.js installed"
else
    print_status "Node.js already installed ($(node --version))"
fi

# Install Foundry
if ! command -v forge &> /dev/null; then
    echo "Installing Foundry..."
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null || true
    foundryup
    print_status "Foundry installed"
else
    print_status "Foundry already installed"
fi

echo ""
echo "🔧 Installing Project Dependencies"
echo "================================="

# Install smart contract dependencies
echo "Installing smart contract dependencies..."
if forge install; then
    print_status "Smart contract dependencies installed"
else
    print_warning "Could not install smart contract dependencies (Foundry may need to be in PATH)"
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
if npm install; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
fi
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
if npm install; then
    print_status "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
fi
cd ..

echo ""
echo "🧹 Cleaning up persistent data"
echo "=============================="

# Clean events.json to prevent ghost events from old test runs
if [ -f "data/events.json" ]; then
    echo "[]" > data/events.json
    print_status "Cleaned data/events.json"
else
    mkdir -p data
    echo "[]" > data/events.json
    print_status "Created fresh data/events.json"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "To start the development environment:"
echo ""
echo "1. Terminal 1 - Start local blockchain:"
echo "   anvil"
echo ""
echo "2. Terminal 2 - Start backend:"
echo "   cd backend && npm run dev"
echo ""
echo "3. Terminal 3 - Start frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Terminal 4 - Deploy contracts (after anvil is running):"
echo "   forge script scripts/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast"
echo ""
echo "📱 Frontend will be available at: http://localhost:5173"
echo "🔧 Backend will be available at: http://localhost:3001"
echo ""
print_warning "Note: You may need to restart your terminal or run 'source ~/.zshrc' for PATH changes to take effect"