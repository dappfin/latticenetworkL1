#!/bin/bash
set -e

# -----------------------------
# HETZNER L1 PRODUCTION DEPLOYMENT
# -----------------------------
LATTICE_VERSION="v1.0.0"
LATTICE_DIR="/opt/lattice"
DATA_DIR="/var/lib/lattice"
NODE_COUNT=2
VM1_PRIVATE_IP="10.10.1.2"
VM2_PRIVATE_IP="10.10.1.3"
VM1_PUBLIC_IP="77.42.84.199"
VM2_PUBLIC_IP="77.42.86.123"

echo "=== HETZNER L1 PRODUCTION DEPLOYMENT ==="
echo "Server Public IP: $(curl -s ifconfig.me)"
echo "Server Private IP: $(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1)"

# -----------------------------
# 1️⃣ Install prerequisites
# -----------------------------
echo "Installing prerequisites..."
apt update && apt install -y curl wget tar ufw git build-essential

# -----------------------------
# 2️⃣ Build Lattice binary from source
# -----------------------------
echo "Building Lattice from source..."
if [ ! -d "$LATTICE_DIR" ]; then
    mkdir -p $LATTICE_DIR
    cd $LATTICE_DIR
    
    # Clone the repository (use the current workspace)
    if [ -d "/home/auli/Latticenetwork/lattice-l1" ]; then
        cp -r /home/auli/Latticenetwork/lattice-l1 $LATTICE_DIR/
        cd $LATTICE_DIR/lattice-l1
        make clean && make
        cp lattice_node $LATTICE_DIR/lattice
        chmod +x $LATTICE_DIR/lattice
    else
        echo "ERROR: Source code not found. Please copy lattice-l1 directory first."
        exit 1
    fi
fi

# -----------------------------
# 3️⃣ Prepare validator directories
# -----------------------------
echo "Creating validator directories..."
for i in $(seq 1 $NODE_COUNT); do
    mkdir -p $DATA_DIR/validator-$i
done

# -----------------------------
# 4️⃣ Initialize genesis (ONLY vm-1)
# -----------------------------
HOST_PRIVATE_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1)

if [ "$HOST_PRIVATE_IP" == "$VM1_PRIVATE_IP" ]; then
    echo "Initializing genesis on vm-1 ($VM1_PRIVATE_IP)..."
    
    # Initialize genesis for validator 1
    cd $LATTICE_DIR
    ./lattice init --home $DATA_DIR/validator-1 --genesis
    
    # Copy genesis to validator 2
    cp $DATA_DIR/validator-1/genesis.json $DATA_DIR/validator-2/
    
    # Create validator keys
    for i in $(seq 1 $NODE_COUNT); do
        ./lattice keys generate --home $DATA_DIR/validator-$i
    done
    
    echo "Genesis initialized on vm-1"
fi

# -----------------------------
# 5️⃣ Copy genesis (vm-2 only)
# -----------------------------
if [ "$HOST_PRIVATE_IP" == "$VM2_PRIVATE_IP" ]; then
    echo "Copying genesis from vm-1 to vm-2 ($VM2_PRIVATE_IP)..."
    
    # Copy genesis files from vm-1
    scp root@$VM1_PUBLIC_IP:$DATA_DIR/validator-1/genesis.json $DATA_DIR/validator-1/
    scp root@$VM1_PUBLIC_IP:$DATA_DIR/validator-1/genesis.json $DATA_DIR/validator-2/
    
    echo "Genesis copied from vm-1"
fi

# -----------------------------
# 6️⃣ Configure validator nodes
# -----------------------------
echo "Configuring validator nodes..."

# Determine validator IDs based on server
if [ "$HOST_PRIVATE_IP" == "$VM1_PRIVATE_IP" ]; then
    VALIDATOR_START=1
    PEERS="$VM2_PRIVATE_IP:26656"
else
    VALIDATOR_START=3
    PEERS="$VM1_PRIVATE_IP:26656"
fi

for i in $(seq 1 $NODE_COUNT); do
    VALIDATOR_ID=$((VALIDATOR_START + i - 1))
    RPC_PORT=$((26657 + VALIDATOR_ID))
    P2P_PORT=$((26656 + VALIDATOR_ID))
    
    # Create node configuration
    cat > $DATA_DIR/validator-$i/node.json <<EOF
{
  "node_id": $VALIDATOR_ID,
  "validator_id": $((VALIDATOR_ID - 1)),
  "rpc": {
    "host": "0.0.0.0",
    "port": $RPC_PORT
  },
  "p2p": {
    "laddr": "tcp://0.0.0.0:$P2P_PORT",
    "peers": ["$PEERS"]
  },
  "db_path": "$DATA_DIR/validator-$i/db",
  "log_path": "$DATA_DIR/validator-$i/logs/node.log",
  "validator_key": "$DATA_DIR/validator-$i/validator.key",
  "genesis_file": "$DATA_DIR/validator-$i/genesis.json"
}
EOF

    # Create indexer configuration
    cat > $DATA_DIR/validator-$i/indexer.json <<EOF
{
  "db_path": "$DATA_DIR/validator-$i/db/indexer.db",
  "log_level": "info",
  "batch_size": 1000,
  "sync_interval": 5
}
EOF

    # Create necessary directories
    mkdir -p $DATA_DIR/validator-$i/db
    mkdir -p $DATA_DIR/validator-$i/logs
done

# -----------------------------
# 7️⃣ Configure systemd services
# -----------------------------
echo "Configuring systemd services..."

for i in $(seq 1 $NODE_COUNT); do
    VALIDATOR_ID=$((VALIDATOR_START + i - 1))
    
    cat > /etc/systemd/system/lattice-validator-$VALIDATOR_ID.service <<EOF
[Unit]
Description=Lattice Validator $VALIDATOR_ID
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$LATTICE_DIR
ExecStart=$LATTICE_DIR/lattice $DATA_DIR/validator-$i/node.json --indexer-config $DATA_DIR/validator-$i/indexer.json
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable lattice-validator-$VALIDATOR_ID
    echo "Service lattice-validator-$VALIDATOR_ID configured"
done

# -----------------------------
# 8️⃣ Configure firewall
# -----------------------------
echo "Configuring firewall..."
ufw default deny incoming
ufw allow 22/tcp

# Allow private network communication
if [ "$HOST_PRIVATE_IP" == "$VM1_PRIVATE_IP" ]; then
    ufw allow from $VM2_PRIVATE_IP to any port 26656:26659 proto tcp
    ufw allow from $VM2_PRIVATE_IP to any port 26657:26659 proto tcp
else
    ufw allow from $VM1_PRIVATE_IP to any port 26656:26659 proto tcp
    ufw allow from $VM1_PRIVATE_IP to any port 26657:26659 proto tcp
fi

ufw --force enable

# -----------------------------
# 9️⃣ Start validators
# -----------------------------
echo "Starting validators..."
for i in $(seq 1 $NODE_COUNT); do
    VALIDATOR_ID=$((VALIDATOR_START + i - 1))
    echo "Starting validator $VALIDATOR_ID..."
    systemctl start lattice-validator-$VALIDATOR_ID
    sleep 2
done

echo "✅ Lattice L1 deployment complete!"
echo "✅ Validators $VALIDATOR_START-$((VALIDATOR_START + NODE_COUNT - 1)) running"
echo "✅ Private IP: $HOST_PRIVATE_IP"
echo "✅ RPC ports: $(seq 26657 $((26657 + NODE_COUNT - 1)))"
echo ""
echo "Verify status:"
echo "curl http://$HOST_PRIVATE_IP:26657/status"
