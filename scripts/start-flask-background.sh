#!/bin/bash

# HDFS Log Analyzer Flask Background Startup Script
# Usage: ./start-flask-background.sh

set -e

echo "🚀 Starting HDFS Log Analyzer Flask Service..."

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "flask-env" ]; then
    echo "❌ Virtual environment not found. Please run setup first."
    exit 1
fi

# Activate virtual environment
source flask-env/bin/activate

# Load environment variables
if [ -f ".env.production" ]; then
    export $(grep -v '^#' .env.production | xargs)
    echo "✅ Loaded production environment variables"
elif [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
    echo "✅ Loaded development environment variables"
else
    echo "⚠️  No environment file found, using defaults"
fi

# Create analysis results directory
mkdir -p analysis_results

# Check if Flask is already running
if pgrep -f "flask-simulator.py" > /dev/null; then
    echo "⚠️  Flask service is already running!"
    echo "   Use: pkill -f flask-simulator.py to stop it first"
    exit 1
fi

# Start Flask in background
echo "🔄 Starting Flask service on port ${FLASK_PORT:-5555}..."
nohup python flask-simulator.py > flask.log 2>&1 &
FLASK_PID=$!

# Wait a moment and check if it started successfully
sleep 3
if ps -p $FLASK_PID > /dev/null; then
    echo "✅ Flask service started successfully!"
    echo "   PID: $FLASK_PID"
    echo "   Port: ${FLASK_PORT:-5555}"
    echo "   Log file: $SCRIPT_DIR/flask.log"
    echo ""
    echo "📋 Management commands:"
    echo "   View logs: tail -f $SCRIPT_DIR/flask.log"
    echo "   Stop service: pkill -f flask-simulator.py"
    echo "   Check status: pgrep -f flask-simulator.py"
else
    echo "❌ Failed to start Flask service"
    echo "   Check logs: cat flask.log"
    exit 1
fi
