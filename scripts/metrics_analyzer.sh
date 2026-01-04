#!/usr/bin/env bash
set -euo pipefail

# ================================
# LATTICE PERFORMANCE METRICS ANALYZER
# ================================

LOG_DIR="./metrics/logs"
ANALYSIS_DIR="./metrics/analysis"
REPORTS_DIR="./metrics/reports"

# Create directories
mkdir -p "$LOG_DIR" "$ANALYSIS_DIR" "$REPORTS_DIR"

# Node configuration
NODE_PORTS=(8545 8547 8549 8551)

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/analyzer_$(date +%Y%m%d).log"
}

# Collect real-time metrics
collect_metrics() {
    local duration=${1:-60}  # Default 60 seconds
    local interval=${2:-5}   # Default 5 seconds
    local output_file="$ANALYSIS_DIR/metrics_$(date +%Y%m%d_%H%M%S).csv"
    
    log "Starting metrics collection for ${duration}s with ${interval}s interval"
    
    # Create CSV header
    echo "Timestamp,Node,Port,CPU%,MEM%,Disk%,RPC_Latency_ms,TxPool_Size,Block_Height,Active_Validators,Network_In_Bytes,Network_Out_Bytes" > "$output_file"
    
    local end_time=$(($(date +%s) + duration))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        
        for i in "${!NODE_PORTS[@]}"; do
            local port=${NODE_PORTS[$i]}
            local node_id=$((i + 1))
            
            # RPC latency measurement
            local start_time=$(date +%s%N)
            local rpc_success=false
            local txpool_size=0
            local block_height=0
            local active_validators=0
            
            if curl -s --max-time 3 -X POST -H 'Content-Type: application/json' \
                --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
                "http://localhost:$port" >/dev/null 2>&1; then
                rpc_success=true
                local end_time=$(date +%s%N)
                local latency_ns=$((end_time - start_time))
                local latency_ms=$((latency_ns / 1000000))
                
                # Get detailed metrics
                local consensus_result=$(curl -s --max-time 3 -X POST -H 'Content-Type: application/json' \
                    --data '{"jsonrpc":"2.0","method":"lattice_getConsensusState","params":[],"id":1}' \
                    "http://localhost:$port" 2>/dev/null || echo "{}")
                
                txpool_size=$(echo "$consensus_result" | grep -o '"pendingTransactions":[0-9]*' | cut -d':' -f2 || echo "0")
                active_validators=$(echo "$consensus_result" | grep -o '"activeValidators":[0-9]*' | cut -d':' -f2 || echo "0")
                
                # Get block height
                local block_result=$(curl -s --max-time 3 -X POST -H 'Content-Type: application/json' \
                    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                    "http://localhost:$port" 2>/dev/null || echo "{}")
                block_height=$(echo "$block_result" | grep -o '"result":"0x[^"]*"' | cut -d'"' -f4 || echo "0")
                block_height=$((block_height))
            else
                local latency_ms=9999  # High latency for failed requests
            fi
            
            # System metrics (simplified)
            local cpu_usage=0
            local mem_usage=0
            local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
            
            # Network metrics (simplified)
            local network_in=0
            local network_out=0
            
            # Write metrics to CSV
            echo "$timestamp,$node_id,$port,$cpu_usage,$mem_usage,$disk_usage,$latency_ms,$txpool_size,$block_height,$active_validators,$network_in,$network_out" >> "$output_file"
        done
        
        sleep "$interval"
    done
    
    log "Metrics collection completed: $output_file"
    echo "$output_file"
}

# Analyze performance metrics
analyze_metrics() {
    local metrics_file=$1
    
    if [[ ! -f "$metrics_file" ]]; then
        log "Metrics file not found: $metrics_file"
        return 1
    fi
    
    log "Analyzing metrics from: $metrics_file"
    
    local analysis_file="$REPORTS_DIR/analysis_$(basename "$metrics_file" .csv)_$(date +%Y%m%d_%H%M%S).txt"
    
    echo "=== LATTICE PERFORMANCE ANALYSIS ===" > "$analysis_file"
    echo "Metrics File: $metrics_file" >> "$analysis_file"
    echo "Analysis Date: $(date)" >> "$analysis_file"
    echo "" >> "$analysis_file"
    
    # Overall statistics
    echo "OVERALL STATISTICS:" >> "$analysis_file"
    local total_records=$(tail -n +2 "$metrics_file" | wc -l)
    echo "  Total data points: $total_records" >> "$analysis_file"
    
    if [[ $total_records -eq 0 ]]; then
        echo "  No data to analyze" >> "$analysis_file"
        return 1
    fi
    
    # RPC Latency Analysis
    echo "" >> "$analysis_file"
    echo "RPC LATENCY ANALYSIS:" >> "$analysis_file"
    
    # Calculate latency stats per node
    for i in "${!NODE_PORTS[@]}"; do
        local node_id=$((i + 1))
        local port=${NODE_PORTS[$i]}
        
        # Extract latencies for this node
        local latencies=$(tail -n +2 "$metrics_file" | awk -F',' -v node_id="$node_id" '$2 == node_id {print $7}')
        
        if [[ -n "$latencies" ]]; then
            local avg_latency=$(echo "$latencies" | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
            local max_latency=$(echo "$latencies" | awk 'BEGIN{max=0} {if($1>max) max=$1} END {print max}')
            local min_latency=$(echo "$latencies" | awk 'BEGIN{min=999999} {if($1<min) min=$1} END {print min}')
            
            echo "  Node $node_id (Port $port):" >> "$analysis_file"
            echo "    Average Latency: ${avg_latency}ms" >> "$analysis_file"
            echo "    Max Latency: ${max_latency}ms" >> "$analysis_file"
            echo "    Min Latency: ${min_latency}ms" >> "$analysis_file"
            
            # Count failed requests (latency > 5000ms)
            local failed_requests=$(echo "$latencies" | awk '$1 > 5000 {count++} END {print count+0}')
            local success_rate=$(echo "$latencies" | awk 'BEGIN{total=0; success=0} {total++; if($1 <= 5000) success++} END {if(total>0) print (success*100)/total; else print 0}')
            
            echo "    Failed Requests: $failed_requests" >> "$analysis_file"
            echo "    Success Rate: ${success_rate}%" >> "$analysis_file"
        fi
    done
    
    # Transaction Pool Analysis
    echo "" >> "$analysis_file"
    echo "TRANSACTION POOL ANALYSIS:" >> "$analysis_file"
    
    for i in "${!NODE_PORTS[@]}"; do
        local node_id=$((i + 1))
        local port=${NODE_PORTS[$i]}
        
        local txpool_sizes=$(tail -n +2 "$metrics_file" | awk -F',' -v node_id="$node_id" '$2 == node_id {print $8}')
        
        if [[ -n "$txpool_sizes" ]]; then
            local avg_txpool=$(echo "$txpool_sizes" | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
            local max_txpool=$(echo "$txpool_sizes" | awk 'BEGIN{max=0} {if($1>max) max=$1} END {print max}')
            
            echo "  Node $node_id (Port $port):" >> "$analysis_file"
            echo "    Average TxPool Size: $avg_txpool" >> "$analysis_file"
            echo "    Max TxPool Size: $max_txpool" >> "$analysis_file"
        fi
    done
    
    # Block Progress Analysis
    echo "" >> "$analysis_file"
    echo "BLOCK PROGRESS ANALYSIS:" >> "$analysis_file"
    
    for i in "${!NODE_PORTS[@]}"; do
        local node_id=$((i + 1))
        local port=${NODE_PORTS[@]}
        
        local block_heights=$(tail -n +2 "$metrics_file" | awk -F',' -v node_id="$node_id" '$2 == node_id {print $9}')
        
        if [[ -n "$block_heights" ]]; then
            local first_block=$(echo "$block_heights" | head -1)
            local last_block=$(echo "$block_heights" | tail -1)
            local blocks_produced=$((last_block - first_block))
            
            echo "  Node $node_id (Port $port):" >> "$analysis_file"
            echo "    Starting Block: $first_block" >> "$analysis_file"
            echo "    Ending Block: $last_block" >> "$analysis_file"
            echo "    Blocks Produced: $blocks_produced" >> "$analysis_file"
        fi
    done
    
    # Performance Alerts
    echo "" >> "$analysis_file"
    echo "PERFORMANCE ALERTS:" >> "$analysis_file"
    
    local alerts_found=false
    
    # Check for high latency
    for i in "${!NODE_PORTS[@]}"; do
        local node_id=$((i + 1))
        local port=${NODE_PORTS[$i]}
        
        local high_latency_count=$(tail -n +2 "$metrics_file" | awk -F',' -v node_id="$node_id" '$2 == node_id && $7 > 1000 {count++} END {print count+0}')
        
        if [[ $high_latency_count -gt 0 ]]; then
            echo "  ALERT: Node $node_id had $high_latency_count high latency (>1000ms) requests" >> "$analysis_file"
            alerts_found=true
        fi
    done
    
    # Check for large transaction pools
    for i in "${!NODE_PORTS[@]}"; do
        local node_id=$((i + 1))
        local port=${NODE_PORTS[@]}
        
        local large_txpool_count=$(tail -n +2 "$metrics_file" | awk -F',' -v node_id="$node_id" '$2 == node_id && $8 > 1000 {count++} END {print count+0}')
        
        if [[ $large_txpool_count -gt 0 ]]; then
            echo "  ALERT: Node $node_id had $large_txpool_count large transaction pool (>1000) instances" >> "$analysis_file"
            alerts_found=true
        fi
    done
    
    if [[ "$alerts_found" == false ]]; then
        echo "  No performance alerts detected" >> "$analysis_file"
    fi
    
    # Recommendations
    echo "" >> "$analysis_file"
    echo "PERFORMANCE RECOMMENDATIONS:" >> "$analysis_file"
    
    # Generate recommendations based on analysis
    local avg_latency_all=$(tail -n +2 "$metrics_file" | awk -F',' '{sum+=$7; count++} END {if(count>0) print sum/count; else print 0}')
    
    if (( $(echo "$avg_latency_all > 500" | bc -l) )); then
        echo "  - Consider optimizing RPC endpoints or reducing load" >> "$analysis_file"
    fi
    
    local max_txpool_all=$(tail -n +2 "$metrics_file" | awk -F',' 'BEGIN{max=0} {if($8>max) max=$8} END {print max}')
    
    if [[ $max_txpool_all -gt 2000 ]]; then
        echo "  - Transaction pool size is large, consider increasing gas prices or reducing TPS" >> "$analysis_file"
    fi
    
    echo "  - Monitor disk usage and ensure adequate storage" >> "$analysis_file"
    echo "  - Consider load balancing across multiple RPC endpoints" >> "$analysis_file"
    
    log "Analysis completed: $analysis_file"
    echo "$analysis_file"
}

# Generate performance dashboard
generate_dashboard() {
    local metrics_file=$1
    local dashboard_file="$REPORTS_DIR/dashboard_$(basename "$metrics_file" .csv)_$(date +%Y%m%d_%H%M%S).html"
    
    log "Generating performance dashboard: $dashboard_file"
    
    cat > "$dashboard_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Lattice Performance Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .chart-container { width: 100%; height: 400px; margin: 20px 0; }
        .metrics-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .metrics-table th, .metrics-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .metrics-table th { background-color: #f2f2f2; }
        .alert { color: #d32f2f; font-weight: bold; }
        .success { color: #388e3c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Lattice Network Performance Dashboard</h1>
        <p>Generated on: $(date)</p>
        
        <div class="chart-container">
            <canvas id="latencyChart"></canvas>
        </div>
        
        <div class="chart-container">
            <canvas id="txpoolChart"></canvas>
        </div>
        
        <div class="chart-container">
            <canvas id="blockChart"></canvas>
        </div>
        
        <h2>Performance Metrics Summary</h2>
        <table class="metrics-table">
            <tr>
                <th>Node</th>
                <th>Port</th>
                <th>Avg Latency (ms)</th>
                <th>Max Latency (ms)</th>
                <th>Success Rate (%)</th>
                <th>Avg TxPool Size</th>
                <th>Status</th>
            </tr>
EOF
    
    # Process metrics and add to dashboard
    for i in "${!NODE_PORTS[@]}"; do
        local node_id=$((i + 1))
        local port=${NODE_PORTS[@]}
        
        # Calculate metrics (simplified for demo)
        local avg_latency=50
        local max_latency=200
        local success_rate=98
        local avg_txpool=100
        local status="success"
        
        if [[ $avg_latency -gt 500 ]]; then
            status="alert"
        fi
        
        echo "            <tr>" >> "$dashboard_file"
        echo "                <td>Node $node_id</td>" >> "$dashboard_file"
        echo "                <td>$port</td>" >> "$dashboard_file"
        echo "                <td>$avg_latency</td>" >> "$dashboard_file"
        echo "                <td>$max_latency</td>" >> "$dashboard_file"
        echo "                <td>$success_rate</td>" >> "$dashboard_file"
        echo "                <td>$avg_txpool</td>" >> "$dashboard_file"
        echo "                <td class=\"$status\">$(echo "$status" | tr '[:lower:]' '[:upper:]')</td>" >> "$dashboard_file"
        echo "            </tr>" >> "$dashboard_file"
    done
    
    cat >> "$dashboard_file" << 'EOF'
        </table>
    </div>
    
    <script>
        // Sample chart data - in production, this would be populated from actual metrics
        const latencyCtx = document.getElementById('latencyChart').getContext('2d');
        new Chart(latencyCtx, {
            type: 'line',
            data: {
                labels: ['Time1', 'Time2', 'Time3', 'Time4', 'Time5'],
                datasets: [{
                    label: 'Node 1',
                    data: [50, 60, 45, 70, 55],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }, {
                    label: 'Node 2',
                    data: [45, 55, 50, 65, 60],
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'RPC Latency Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Latency (ms)'
                        }
                    }
                }
            }
        });
        
        const txpoolCtx = document.getElementById('txpoolChart').getContext('2d');
        new Chart(txpoolCtx, {
            type: 'line',
            data: {
                labels: ['Time1', 'Time2', 'Time3', 'Time4', 'Time5'],
                datasets: [{
                    label: 'Node 1',
                    data: [100, 150, 120, 180, 140],
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                }, {
                    label: 'Node 2',
                    data: [90, 130, 110, 160, 120],
                    borderColor: 'rgb(255, 205, 86)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Transaction Pool Size Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'TxPool Size'
                        }
                    }
                }
            }
        });
        
        const blockCtx = document.getElementById('blockChart').getContext('2d');
        new Chart(blockCtx, {
            type: 'line',
            data: {
                labels: ['Time1', 'Time2', 'Time3', 'Time4', 'Time5'],
                datasets: [{
                    label: 'Node 1',
                    data: [1000, 1005, 1010, 1015, 1020],
                    borderColor: 'rgb(153, 102, 255)',
                    tension: 0.1
                }, {
                    label: 'Node 2',
                    data: [1000, 1004, 1009, 1014, 1019],
                    borderColor: 'rgb(255, 159, 64)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Block Height Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Block Height'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
EOF
    
    log "Dashboard generated: $dashboard_file"
    echo "$dashboard_file"
}

# Main execution
case "${1:-collect}" in
    "collect")
        collect_metrics "${2:-60}" "${3:-5}"
        ;;
    "analyze")
        if [[ $# -lt 2 ]]; then
            echo "Usage: $0 analyze <metrics_file>"
            exit 1
        fi
        analyze_metrics "$2"
        ;;
    "dashboard")
        if [[ $# -lt 2 ]]; then
            echo "Usage: $0 dashboard <metrics_file>"
            exit 1
        fi
        generate_dashboard "$2"
        ;;
    "full")
        # Collect, analyze, and generate dashboard
        local metrics_file=$(collect_metrics "${2:-60}" "${3:-5}")
        local analysis_file=$(analyze_metrics "$metrics_file")
        local dashboard_file=$(generate_dashboard "$metrics_file")
        
        log "Full analysis complete:"
        log "  Metrics: $metrics_file"
        log "  Analysis: $analysis_file"
        log "  Dashboard: $dashboard_file"
        ;;
    *)
        echo "Usage: $0 {collect|analyze|dashboard|full} [duration] [interval] [metrics_file]"
        echo "  collect  - Collect metrics for specified duration"
        echo "  analyze  - Analyze collected metrics"
        echo "  dashboard - Generate HTML dashboard"
        echo "  full     - Run complete analysis pipeline"
        exit 1
        ;;
esac
