# 🚀 Google Cloud VM Setup Guide

Complete guide for deploying the HDFS Log Analyzer Flask service on Google Cloud VM.

## 📋 Prerequisites

- Google Cloud VM instance (Ubuntu 20.04+ recommended)
- SSH access to your VM
- Repository cloned on the VM

## 🔧 Quick Setup (Automated)

### 1. Run the Setup Script
```bash
cd log-analyzer/scripts
./setup-vm.sh
```

This script will:
- Update system packages
- Install Python 3 and dependencies
- Create virtual environment
- Install Flask packages
- Configure environment variables
- Auto-detect VM external IP

### 2. Configure Firewall (Optional)
```bash
# If you have gcloud CLI configured
./setup-firewall.sh
```

Or manually in Google Cloud Console:
- Go to VPC Network → Firewall
- Create rule for port 5555 (Flask)
- Create rule for port 3000 (Next.js)

### 3. Start Flask Service
```bash
./manage-flask.sh start
```

## 🛠️ Manual Setup (Step by Step)

### 1. System Setup
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip python3-venv git curl htop build-essential python3-dev libssl-dev libffi-dev
```

### 2. Python Environment
```bash
cd log-analyzer/scripts

# Create virtual environment
python3 -m venv flask-env

# Activate environment
source flask-env/bin/activate

# Install packages
pip install --upgrade pip
pip install -r requirements-flask.txt
```

### 3. Configure Environment
```bash
# Edit production config
nano .env.production

# Update YOUR_VM_EXTERNAL_IP with your actual external IP
# Get external IP: curl -s ifconfig.me
```

### 4. Start Service
```bash
# Start Flask in background
./start-flask-background.sh

# Or use management script
./manage-flask.sh start
```

## 🎮 Service Management

### Flask Service Commands
```bash
# Start service
./manage-flask.sh start

# Stop service
./manage-flask.sh stop

# Restart service
./manage-flask.sh restart

# Check status
./manage-flask.sh status

# View logs
./manage-flask.sh logs

# Follow logs in real-time
tail -f flask.log
```

### Manual Process Management
```bash
# Check if running
pgrep -f flask-simulator.py

# Kill process
pkill -f flask-simulator.py

# Force kill
pkill -9 -f flask-simulator.py
```

## 🔥 Firewall Configuration

### Google Cloud Console
1. Go to VPC Network → Firewall
2. Click "Create Firewall Rule"
3. Create rule for Flask service:
   - Name: `hdfs-flask-service`
   - Direction: Ingress
   - Action: Allow
   - Targets: All instances in the network
   - Source IP ranges: `0.0.0.0/0`
   - Protocols and ports: TCP port `5555`

### Using gcloud CLI
```bash
# Flask service (port 5555)
gcloud compute firewall-rules create hdfs-flask-service \
    --allow tcp:5555 \
    --source-ranges 0.0.0.0/0 \
    --description "HDFS Log Analyzer Flask Service"

# Next.js app (port 3000)
gcloud compute firewall-rules create hdfs-nextjs-app \
    --allow tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --description "HDFS Log Analyzer Next.js App"
```

## 🔧 Systemd Service (Optional)

For production, set up as a systemd service:

```bash
# Edit service file with your paths
nano flask-analyzer.service

# Copy to systemd
sudo cp flask-analyzer.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable flask-analyzer
sudo systemctl start flask-analyzer

# Check status
sudo systemctl status flask-analyzer
```

## 🌐 Environment Variables

Key variables in `.env.production`:

```bash
# Flask Configuration
FLASK_PORT=5555
FLASK_HOST=0.0.0.0
FLASK_ENV=production

# Next.js URLs (update with your VM IP)
NEXT_PUBLIC_URL=http://YOUR_VM_EXTERNAL_IP:3000
NEXT_CALLBACK_BASE_URL=http://YOUR_VM_EXTERNAL_IP:3000/api/analysis-callback

# Analysis Settings
CALLBACK_DELAY_SECONDS=0.01
ANALYSIS_RESULTS_DIR=analysis_results
```

## 📊 Monitoring

### Check Service Health
```bash
# Service status
./manage-flask.sh status

# Test Flask endpoint
curl http://localhost:5555/health

# Check logs
tail -f flask.log
```

### Resource Usage
```bash
# System resources
htop

# Process info
ps aux | grep flask-simulator

# Memory usage
free -h

# Disk usage
df -h
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo netstat -tlnp | grep :5555
   pkill -f flask-simulator.py
   ```

2. **Permission denied**
   ```bash
   chmod +x *.sh
   ```

3. **Virtual environment not found**
   ```bash
   cd scripts
   python3 -m venv flask-env
   source flask-env/bin/activate
   pip install -r requirements-flask.txt
   ```

4. **Flask not starting**
   ```bash
   # Check logs
   cat flask.log
   
   # Test manually
   source flask-env/bin/activate
   python flask-simulator.py
   ```

### Log Files
- Flask logs: `scripts/flask.log`
- System logs: `sudo journalctl -u flask-analyzer`

## 🔗 URLs

After setup, your services will be available at:
- Flask API: `http://YOUR_VM_EXTERNAL_IP:5555`
- Health check: `http://YOUR_VM_EXTERNAL_IP:5555/health`
- Next.js app: `http://YOUR_VM_EXTERNAL_IP:3000` (if running)

## 🎯 Next Steps

1. ✅ Set up Flask service (this guide)
2. 🌐 Deploy Next.js application
3. 🗄️ Configure database connection
4. 🔒 Set up SSL certificates (production)
5. 📊 Configure monitoring and alerts

---

**Need help?** Check the logs first: `./manage-flask.sh logs` 