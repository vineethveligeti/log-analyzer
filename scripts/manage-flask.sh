#!/bin/bash

# HDFS Log Analyzer Flask Management Script
# Usage: ./manage-flask.sh [start|stop|restart|status|logs]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "${1:-help}" in
    start)
        echo "🚀 Starting Flask service..."
        ./start-flask-background.sh
        ;;
    
    stop)
        echo "🛑 Stopping Flask service..."
        if pgrep -f "flask-simulator.py" > /dev/null; then
            pkill -f flask-simulator.py
            sleep 2
            if ! pgrep -f "flask-simulator.py" > /dev/null; then
                echo "✅ Flask service stopped successfully"
            else
                echo "⚠️  Force killing Flask service..."
                pkill -9 -f flask-simulator.py
            fi
        else
            echo "ℹ️  Flask service is not running"
        fi
        ;;
    
    restart)
        echo "🔄 Restarting Flask service..."
        $0 stop
        sleep 2
        $0 start
        ;;
    
    status)
        echo "📊 Flask Service Status:"
        if pgrep -f "flask-simulator.py" > /dev/null; then
            PID=$(pgrep -f "flask-simulator.py")
            echo "✅ Status: RUNNING"
            echo "   PID: $PID"
            echo "   Port: ${FLASK_PORT:-5555}"
            echo "   Memory: $(ps -o rss= -p $PID | awk '{print $1/1024 " MB"}')"
            echo "   CPU: $(ps -o %cpu= -p $PID)%"
        else
            echo "❌ Status: STOPPED"
        fi
        ;;
    
    logs)
        echo "📋 Flask Service Logs (last 50 lines):"
        if [ -f "flask.log" ]; then
            tail -n 50 flask.log
            echo ""
            echo "💡 Use 'tail -f flask.log' to follow logs in real-time"
        else
            echo "❌ No log file found"
        fi
        ;;
    
    help|*)
        echo "🔧 HDFS Log Analyzer Flask Management"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start    - Start Flask service in background"
        echo "  stop     - Stop Flask service"
        echo "  restart  - Restart Flask service"
        echo "  status   - Show service status"
        echo "  logs     - Show recent logs"
        echo "  help     - Show this help message"
        ;;
esac
