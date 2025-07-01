#!/bin/bash

# Google Cloud Firewall Setup for HDFS Log Analyzer
# Run this script to configure firewall rules

set -e

echo "🔥 Setting up Google Cloud Firewall Rules..."

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK first."
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No active Google Cloud project found. Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Current project: $PROJECT_ID"

# Create firewall rule for Flask service (port 5555)
echo "🔧 Creating firewall rule for Flask service (port 5555)..."
gcloud compute firewall-rules create hdfs-flask-service \
    --allow tcp:5555 \
    --source-ranges 0.0.0.0/0 \
    --description "HDFS Log Analyzer Flask Service" \
    --project "$PROJECT_ID" || echo "⚠️  Rule may already exist"

# Create firewall rule for Next.js (port 3000) if needed
echo "🔧 Creating firewall rule for Next.js (port 3000)..."
gcloud compute firewall-rules create hdfs-nextjs-app \
    --allow tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --description "HDFS Log Analyzer Next.js App" \
    --project "$PROJECT_ID" || echo "⚠️  Rule may already exist"

echo ""
echo "✅ Firewall setup completed!"
echo ""
echo "📋 Created rules:"
echo "  - hdfs-flask-service: Port 5555 (Flask API)"
echo "  - hdfs-nextjs-app: Port 3000 (Next.js App)"
echo ""
echo "🔍 View all firewall rules:"
echo "  gcloud compute firewall-rules list --filter='name~hdfs'"
