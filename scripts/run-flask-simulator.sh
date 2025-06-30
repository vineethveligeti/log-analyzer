# HDFS Log Analysis Flask Simulator Runner
# This script sets up and runs the Flask simulator

echo "🚀 Starting HDFS Log Analysis Flask Simulator"
echo "=============================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed"
    exit 1
fi

# Install required packages
echo "📦 Installing required Python packages..."
pip3 install flask requests

# Create analysis results directory
mkdir -p analysis_results

# Set environment variables
export FLASK_ENV=development
export FLASK_DEBUG=1

echo ""
echo "🔧 Configuration:"
echo "   - Host: 0.0.0.0"
echo "   - Port: 5555"
echo "   - Results Directory: ./analysis_results"
echo "   - Processing Delay: 2 seconds per block"
echo ""
echo "🔗 Endpoints:"
echo "   - POST http://localhost:5555/analyze"
echo "   - GET  http://localhost:5555/health"
echo "   - GET  http://localhost:5555/status/<job_id>"
echo "   - GET  http://localhost:5555/results/<filename>"
echo ""
echo "💡 To test the service:"
echo "   curl http://localhost:5555/health"
echo ""
echo "🛑 Press Ctrl+C to stop the service"
echo "=============================================="

# Run the Flask simulator
python3 scripts/flask-simulator.py
