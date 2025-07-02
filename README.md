# 🚀 HDFS Log Analyzer - Complete Setup Guide

A comprehensive Next.js and Flask-based application for analyzing HDFS log files with AI-powered anomaly detection.

## 📋 Prerequisites

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python 3** (v3.8 or higher) - [Download here](https://python.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Database** - Neon PostgreSQL (or any PostgreSQL instance)

## 🏗️ Project Architecture

```
HDFS Log Analyzer
├── Next.js Frontend & API Routes (Port 3000)
├── Flask Analysis Service (Port 5555)
└── PostgreSQL Database (Neon/Cloud)
```

---

## 🎯 Quick Start (Recommended)

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd log-analyzer
```

### 2. Setup Environment Variables
```bash
# Copy environment template
cp env.example .env.local

# Edit with your database URL
nano .env.local
```

Required environment variables:
```env
DATABASE_URL="postgresql://username:password@host/database"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
FLASK_PORT="5555"
```

### 3. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd scripts
pip3 install -r requirements-flask.txt
cd ..
```

### 4. Start Both Services
```bash
# Terminal 1: Start Next.js server
npm run dev

# Terminal 2: Start Flask server
cd scripts
./manage-flask.sh start
```

🎉 **Ready!** Open [http://localhost:3000](http://localhost:3000)

---

## 📱 Next.js Frontend Setup

### 1. Install Node.js Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env.local` file in the root directory:
```env
# Database Configuration
DATABASE_URL="your_postgresql_connection_string"

# Application URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_FLASK_PORT="5555"

# Flask Service Configuration
FLASK_PORT="5555"
FLASK_SERVICE_URL="http://localhost:5555"
```

### 3. Database Setup
```bash
# Run database migrations (if available)
# Or create tables manually using scripts in /scripts folder
```

### 4. Start Development Server
```bash
# Development mode (with hot reload)
npm run dev

# Production build and start
npm run build
npm start
```

### 5. Verify Next.js Setup
- **Development**: [http://localhost:3000](http://localhost:3000)
- **Login Page**: [http://localhost:3000/login](http://localhost:3000/login)
- **Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## 🐍 Flask Analysis Service Setup

### 1. Navigate to Scripts Directory
```bash
cd scripts
```

### 2. Install Python Dependencies
```bash
# Create virtual environment (recommended)
python3 -m venv flask-env
source flask-env/bin/activate  # On Windows: flask-env\Scripts\activate

# Install required packages
pip install -r requirements-flask.txt
```

### 3. Configure Flask Environment
Create `.env` file in the `scripts` directory:
```env
# Flask Service Configuration
FLASK_PORT=5555
FLASK_HOST=0.0.0.0
FLASK_ENV=development

# Next.js Application Configuration
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_CALLBACK_BASE_URL=http://localhost:3000/api/analysis-callback

# Analysis Configuration
CALLBACK_DELAY_SECONDS=0.01
ANALYSIS_RESULTS_DIR=analysis_results
```

### 4. Start Flask Service

#### Option A: Using Management Script (Recommended)
```bash
# Start Flask service
./manage-flask.sh start

# Check status
./manage-flask.sh status

# View logs
./manage-flask.sh logs

# Stop service
./manage-flask.sh stop

# Restart service
./manage-flask.sh restart
```

#### Option B: Direct Python Execution
```bash
# Activate virtual environment
source flask-env/bin/activate

# Start Flask manually
python flask-simulator.py
```

#### Option C: Using npm Script (from root directory)
```bash
# From project root
npm run flask-simulator
```

### 5. Verify Flask Setup
- **Health Check**: [http://localhost:5555/health](http://localhost:5555/health)
- **Expected Response**: `{"status": "healthy", "service": "HDFS Log Analysis Flask Simulator"}`

---

## 🔧 Development Workflow

### Starting Both Services
```bash
# Terminal 1: Next.js (from project root)
npm run dev

# Terminal 2: Flask (from scripts directory)
cd scripts
./manage-flask.sh start
```

### Monitoring Services
```bash
# Check Flask status
cd scripts
./manage-flask.sh status

# View Flask logs in real-time
./manage-flask.sh logs
tail -f flask.log

# Check Next.js
curl http://localhost:3000/api/flask-health
```

### Development Tips
1. **Hot Reload**: Next.js automatically reloads on file changes
2. **Flask Restart**: Use `./manage-flask.sh restart` after code changes
3. **Database**: Ensure your database is accessible and tables are created
4. **CORS**: Flask is configured to accept requests from localhost:3000

---

## 🚀 Production Deployment

### Next.js Production
```bash
# Build for production
npm run build

# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start npm --name "hdfs-analyzer" -- start
```

### Flask Production
```bash
cd scripts

# Use production environment
cp .env.production .env

# Start with production settings
FLASK_ENV=production python flask-simulator.py

# Or use systemd service
sudo cp flask-analyzer.service /etc/systemd/system/
sudo systemctl enable flask-analyzer
sudo systemctl start flask-analyzer
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Connection refused" - Flask not running
```bash
cd scripts
./manage-flask.sh status
./manage-flask.sh start
```

#### 2. "Module not found" - Missing dependencies
```bash
# Next.js
npm install

# Flask
cd scripts
pip install -r requirements-flask.txt
```

#### 3. "Database connection failed"
- Check your `DATABASE_URL` in `.env.local`
- Ensure database is accessible
- Verify connection string format

#### 4. "Port already in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill

# Kill process on port 5555
lsof -ti:5555 | xargs kill
```

#### 5. Flask service won't start
```bash
cd scripts

# Check Python version
python3 --version

# Check virtual environment
source flask-env/bin/activate
pip list

# Manual start for debugging
python flask-simulator.py
```

### Health Checks
```bash
# Next.js health
curl http://localhost:3000/api/flask-health

# Flask health
curl http://localhost:5555/health

# Database connection (via Next.js)
curl http://localhost:3000/api/auth/me
```

---

## 📁 Project Structure

```
log-analyzer/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   ├── dashboard/                # Dashboard page
│   ├── login/                    # Login page
│   └── register/                 # Register page
├── components/                   # React components
│   ├── ui/                       # UI components
│   └── *.tsx                     # Feature components
├── lib/                          # Utility libraries
├── scripts/                      # Flask service & utilities
│   ├── flask-simulator.py        # Main Flask application
│   ├── manage-flask.sh           # Flask management script
│   ├── requirements-flask.txt    # Python dependencies
│   └── *.sql                     # Database migrations
├── public/                       # Static assets
├── .env.local                    # Environment variables
└── package.json                  # Node.js dependencies
```

---

## 🎯 Features

- **User Authentication** - Login/Register system
- **File Upload** - HDFS log file upload with progress tracking
- **Real-time Analysis** - Flask-powered ML analysis
- **Auto-refresh** - Live status updates via SSE
- **Anomaly Detection** - AI-powered log analysis
- **Results Visualization** - Interactive charts and tables
- **File Management** - Automatic cleanup and optimization

---

## 🔗 Useful Commands

### Development
```bash
# Start everything
npm run dev & cd scripts && ./manage-flask.sh start

# Build and test
npm run build
npm run lint

# Flask management
cd scripts
./manage-flask.sh [start|stop|restart|status|logs]
```

### Production
```bash
# Deploy Next.js
npm run build && npm start

# Deploy Flask
cd scripts && FLASK_ENV=production python flask-simulator.py
```

---

## 📞 Support

If you encounter issues:

1. **Check logs**: `./manage-flask.sh logs` and browser console
2. **Verify setup**: Follow this guide step-by-step
3. **Environment**: Ensure all environment variables are set
4. **Dependencies**: Reinstall if needed (`npm install`, `pip install -r requirements-flask.txt`)

---

**Happy analyzing! 🎉** 