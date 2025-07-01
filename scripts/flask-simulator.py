"""
Flask Service Simulator for HDFS Log Analysis
Simulates the external Flask service that processes HDFS blocks and sends results back
"""

import json
import random
import time
import csv
import os
from datetime import datetime
from flask import Flask, request, jsonify
import requests
import threading

import sys
sys.path.append('../')
from loglizer import dataloader, preprocessing
import joblib

app = Flask(__name__)

# Configuration
ANALYSIS_RESULTS_DIR = "analysis_results"
CALLBACK_DELAY_SECONDS = 2  # Delay between processing each block

# Ensure results directory exists
os.makedirs(ANALYSIS_RESULTS_DIR, exist_ok=True)

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, 'loglizer_LR_model_benchmark.joblib')
model = joblib.load(model_path) # 👈 Load your saved model
print('Model loaded successfully. ✅')

# Sample anomaly reasons for different risk levels
ANOMALY_REASONS = {
    "high": [
        "Block corruption detected - checksum mismatch",
        "Unusual replication pattern from multiple sources",
        "Failed block allocation - potential storage issue",
        "Suspicious access pattern detected",
        "Block size anomaly - significantly larger than expected",
        "Multiple failed read attempts on block",
        "Unauthorized access attempt detected",
        "Block metadata inconsistency found"
    ],
    "medium": [
        "Higher than normal replication requests",
        "Block corruption detected - checksum mismatch",
        "Unusual replication pattern from multiple sources",
        "Failed block allocation - potential storage issue",
        "Suspicious access pattern detected",
        "Block size anomaly - significantly larger than expected",
        "Multiple failed read attempts on block",
        "Unauthorized access attempt detected",
        "Block metadata inconsistency found"
    ],
    "low": [
        "Higher than normal replication requests",
        "Block access from unusual IP range",
        "Delayed block allocation response",
        "Non-standard block naming pattern",
        "Elevated error rate for this block",
        "Unusual timestamp pattern in block operations",
        "Block size slightly above normal threshold",
        "Minor metadata validation warnings"
    ],
    "normal": [
        "Normal block operation",
        "Standard replication pattern",
        "Regular block allocation",
        "Typical access pattern",
        "Normal block size and metadata",
        "Standard HDFS operation",
        "Regular data node communication",
        "Normal file system activity"
    ]
}

def generate_anomaly_score_and_reason(block_id, component, content):
    """Generate realistic anomaly scores and reasons based on log content"""
    
    # Analyze content for suspicious patterns
    content_lower = content.lower()
    
    # High risk indicators
    if any(keyword in content_lower for keyword in ['failed', 'error', 'corruption', 'suspicious']):
        score = random.uniform(75, 95)
        reason_category = "high"
    # Medium risk indicators  
    elif any(keyword in content_lower for keyword in ['warn', 'unusual', 'multiple', 'delayed']):
        score = random.uniform(45, 75)
        reason_category = "medium"
    # Component-based risk assessment
    elif 'datanode' in component.lower() and 'receiving' in content_lower:
        # DataNode operations - generally lower risk but some variation
        score = random.uniform(10, 40)
        reason_category = "low" if score < 30 else "medium"
    elif 'fsnamesystem' in component.lower():
        # NameSystem operations - slightly higher baseline risk
        score = random.uniform(15, 45)
        reason_category = "low" if score < 35 else "medium"
    else:
        # Default case
        score = random.uniform(5, 30)
        reason_category = "low"
    
    # Add some randomness for realistic variation
    score += random.uniform(-5, 5)
    score = max(0, min(100, score))  # Clamp between 0-100
    
    # Select appropriate reason
    reason = random.choice(ANOMALY_REASONS[reason_category])
    
    # Add specific details based on content
    if 'blk_' in content:
        if score > 70:
            reason += f" - Block {block_id} requires immediate attention"
        elif score > 50:
            reason += f" - Block {block_id} shows concerning patterns"
    
    return round(score, 2), reason


def inference(file_path):
    print(file_path)
    (x_train, y_train), (x_test, y_test), _= dataloader.load_HDFS(file_path,
                                                                label_file=None,
                                                                window='session', 
                                                                train_ratio=0,
                                                                split_type='uniform')

    feature_extractor = preprocessing.FeatureExtractor()
    feature_extractor.inference_mode()
    x_test = feature_extractor.transform(x_test)

    # print(' prediction probs:')
    pred_probs = model.predict_proba(x_test)[:10]
    return pred_probs

def process_blocks_async(upload_id, block_data, callback_url, analysis_filename):
    """Process blocks sequentially and send completion notification when done"""
    
    print(f"Starting sequential processing for upload {upload_id}")
    print(f"Processing {len(block_data)} blocks...")
    
    # Create analysis results file
    analysis_filepath = os.path.join(ANALYSIS_RESULTS_DIR, analysis_filename)
    
    try:
        with open(analysis_filepath, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['block_id', 'anomaly_score', 'reason']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for i, block_info in enumerate(block_data):
                block_id = block_info['block_id']
                component = block_info.get('component', 'unknown')
                content = block_info.get('content', '')
                
                # Generate analysis result
                anomaly_score, reason = generate_anomaly_score_and_reason(block_id, component, content)
                
                # Write to CSV immediately
                writer.writerow({
                    'block_id': block_id,
                    'anomaly_score': anomaly_score,
                    'reason': reason
                })
                
                # Force flush to ensure data is written to disk
                csvfile.flush()
                
                print(f"✓ Processed block {block_id} (Score: {anomaly_score}%) - Written to CSV")
                
                # Add delay between processing blocks
                time.sleep(CALLBACK_DELAY_SECONDS)
        
        # Ensure file is properly closed and saved
        print(f"✓ CSV file completed: {analysis_filename}")
        
    except Exception as e:
        print(f"✗ Error writing CSV file: {e}")
        return
    
    # Send completion notification to Next.js with all results
    completion_data = {
        'upload_id': upload_id,
        'analysis_complete': True,
        'analysis_filename': analysis_filename,
        'analysis_filepath': analysis_filepath,
        'total_blocks_processed': len(block_data),
        'results': []
    }
    
    # Read the CSV file and include all results in the completion notification
    try:
        with open(analysis_filepath, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                completion_data['results'].append({
                    'block_id': row['block_id'],
                    'anomaly_score': float(row['anomaly_score']),
                    'reason': row['reason']
                })
    except Exception as e:
        print(f"⚠️  Error reading CSV for completion notification: {e}")
    
    try:
        response = requests.post(callback_url + '-complete', json=completion_data, timeout=10)
        print(f"✓ Analysis complete notification sent for upload {upload_id}")
        print(f"✓ Sent {len(completion_data['results'])} results to Next.js")
    except Exception as e:
        print(f"⚠️  Error sending completion notification: {e} (but analysis is complete)")
    
    print(f"Analysis complete for upload {upload_id}. Results saved to {analysis_filename}")
    print(f"📁 File location: {os.path.abspath(analysis_filepath)}")

@app.route('/analyze', methods=['POST'])
def analyze_hdfs_logs():
    """Receive HDFS log analysis request from Next.js"""
    
    try:
        data = request.get_json()
        
        # Extract request data
        upload_id = data.get('upload_id')
        filename = data.get('filename', 'unknown.log')
        total_entries = data.get('total_entries', 0)
        block_ids = data.get('block_ids', [])
        callback_url = data.get('callback_url')
        
        print(f"\n🔍 Received analysis request:")
        print(f"   Upload ID: {upload_id}")
        print(f"   Filename: {filename}")
        print(f"   Total entries: {total_entries}")
        print(f"   Unique blocks: {len(block_ids)}")
        print(f"   Callback URL: {callback_url}")
        
        if not upload_id or not callback_url or not block_ids:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Generate analysis filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        analysis_filename = f"analysis_{upload_id}_{timestamp}.csv"
        
        # Create block data with mock component and content info
        block_data = []
        for block_id in block_ids:
            # Simulate different components and content types
            components = ['dfs.DataNode$DataXceiver', 'dfs.FSNamesystem', 'dfs.BlockManager']
            component = random.choice(components)
            
            # Generate realistic content based on component
            if 'DataNode' in component:
                content = f"Receiving block {block_id} src: /10.250.{random.randint(1,50)}.{random.randint(1,255)}"
            elif 'FSNamesystem' in component:
                content = f"BLOCK* NameSystem.allocateBlock: /mnt/hadoop/data/file_{random.randint(1,1000)}.dat. {block_id}"
            else:
                content = f"Block operation for {block_id}"
            
            # Add some error conditions for testing
            if random.random() < 0.1:  # 10% chance of error
                content = f"Failed to process block {block_id} - " + random.choice(['checksum error', 'timeout', 'corruption detected'])
            elif random.random() < 0.05:  # 5% chance of warning
                content = f"Warning: Unusual pattern detected for block {block_id}"
            
            block_data.append({
                'block_id': block_id,
                'component': component,
                'content': content
            })
        
        # Start async processing
        thread = threading.Thread(
            target=process_blocks_async,
            args=(upload_id, block_data, callback_url, analysis_filename)
        )
        thread.daemon = True
        thread.start()
        
        # Return immediate response
        response = {
            'job_id': f"job_{upload_id}_{timestamp}",
            'status': 'processing',
            'message': f'Analysis started for {len(block_ids)} blocks',
            'estimated_completion_time': len(block_ids) * CALLBACK_DELAY_SECONDS,
            'analysis_filename': analysis_filename
        }
        
        print(f"✓ Analysis job started: {response['job_id']}")
        return jsonify(response), 200
        
    except Exception as e:
        print(f"✗ Error in analyze endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get status of analysis job"""
    # This is a simple implementation - in a real system you'd track job status
    return jsonify({
        'job_id': job_id,
        'status': 'processing',
        'message': 'Analysis in progress'
    })

@app.route('/results/<filename>', methods=['GET'])
def get_analysis_results(filename):
    """Download analysis results file"""
    try:
        filepath = os.path.join(ANALYSIS_RESULTS_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            return content, 200, {'Content-Type': 'text/csv'}
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'HDFS Log Analysis Flask Simulator',
        'timestamp': datetime.now().isoformat(),
        'results_directory': ANALYSIS_RESULTS_DIR
    })

if __name__ == '__main__':
    print("🚀 Starting HDFS Log Analysis Flask Simulator")
    print(f"📁 Analysis results will be saved to: {os.path.abspath(ANALYSIS_RESULTS_DIR)}")
    print(f"⏱️  Processing delay: {CALLBACK_DELAY_SECONDS} seconds per block")
    print("🔗 Available endpoints:")
    print("   POST /analyze - Receive analysis requests")
    print("   GET /status/<job_id> - Check job status")
    print("   GET /results/<filename> - Download results")
    print("   GET /health - Health check")
    print("\n" + "="*50)
    
    app.run(host='0.0.0.0', port=5555, debug=True)
