#!/bin/bash

# HDFS Log Analyzer - Google Cloud VM Setup Script
# Run this script on your Google Cloud VM after cloning the repository

set -e

echo "🚀 HDFS Log Analyzer - VM Setup Starting..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required system packages
echo "🔧 Installing system dependencies..."
sudo apt install -y python3 python3-pip python3-venv git curl htop build-essential python3-dev libssl-dev libffi-dev

# Get current user and directory
CURRENT_USER=$(whoami)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📁 Project directory: $PROJECT_DIR"
echo "👤 Current user: $CURRENT_USER"

# Create virtual environment
echo "🐍 Creating Python virtual environment..."
cd "$SCRIPT_DIR"
python3 -m venv flask-env

# Activate virtual environment
echo "⚡ Activating virtual environment..."
source flask-env/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Flask dependencies
echo "📚 Installing Python packages..."
pip install -r requirements-flask.txt

# Update systemd service file with correct paths
echo "🔧 Configuring systemd service..."
sed -i "s|YOUR_USERNAME|$CURRENT_USER|g" flask-analyzer.service
sed -i "s|/home/YOUR_USERNAME/log-analyzer|$PROJECT_DIR|g" flask-analyzer.service

# Get VM external IP (if available)
EXTERNAL_IP=$(curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/external-ip 2>/dev/null || echo "YOUR_VM_EXTERNAL_IP")

# Update production environment file
echo "🌐 Configuring environment variables..."
if [ "$EXTERNAL_IP" != "YOUR_VM_EXTERNAL_IP" ]; then
    sed -i "s|YOUR_VM_EXTERNAL_IP|$EXTERNAL_IP|g" .env.production
    echo "✅ Configured with external IP: $EXTERNAL_IP"
else
    echo "⚠️  Could not auto-detect external IP. Please update .env.production manually."
fi

# Create analysis results directory
mkdir -p analysis_results

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env.production with your VM's external IP if needed:"
echo "   nano .env.production"
echo ""
echo "2. Start Flask service:"
echo "   ./manage-flask.sh start"
echo ""
echo "3. Check service status:"
echo "   ./manage-flask.sh status"
echo ""
echo "4. View logs:"
echo "   ./manage-flask.sh logs"
echo ""
echo "🔥 Your Flask service will run on port 5555"
echo "🌐 Make sure to open port 5555 in Google Cloud firewall!"
