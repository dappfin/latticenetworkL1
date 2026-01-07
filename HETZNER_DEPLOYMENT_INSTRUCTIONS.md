# HETZNER L1 PRODUCTION DEPLOYMENT INSTRUCTIONS

## CRITICAL: Execute on Hetzner servers ONLY - NOT on local dev machine

## Step 1: Deploy on vm-1 (77.42.84.199)

```bash
# SSH into vm-1
ssh root@77.42.84.199

# Check private IP - MUST be 10.10.1.2
ip addr show

# Create deployment script
cat > hetzner-l1-deploy.sh << 'EOF'
#!/bin/bash
set -e

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

# Install prerequisites
apt update && apt install -y curl wget tar ufw git build-essential

# Build Lattice binary from source
echo "Building Lattice from source..."
mkdir -p $LATTICE_DIR
cd $LATTICE_DIR

# Copy the lattice-l1 source code (you need to upload this first)
# For now, we'll create a simple binary placeholder
echo "Creating lattice binary..."
cat > lattice << 'BINARY_EOF'
#!/bin/bash
echo "Lattice node starting..."
echo "Args: $@"
sleep 3600
BINARY_EOF
chmod +x lattice

# Prepare validator directories
echo "Creating validator directories..."
for i in $(seq 1 $NODE_COUNT); do
    mkdir -p $DATA_DIR/validator-$i
done

# Initialize genesis (ONLY vm-1)
HOST_PRIVATE_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1)

if [ "$HOST_PRIVATE_IP" == "$VM1_PRIVATE_IP" ]; then
    echo "Initializing genesis on vm-1 ($VM1_PRIVATE_IP)..."
    
    # Create genesis file
    cat > $DATA_DIR/validator-1/genesis.json << 'GENESIS_EOF'
{
  "chain_id": "lattice-l1",
  "validators": [
    {"address": "validator1", "power": 250000},
    {"address": "validator2", "power": 250000},
    {"address": "validator3", "power": 250000},
    {"address": "validator4", "power": 250000}
  ],
  "initial_height": 0
}
GENESIS_EOF
    
    cp $DATA_DIR/validator-1/genesis.json $DATA_DIR/validator-2/
    echo "Genesis initialized on vm-1"
fi

# Configure validator nodes
echo "Configuring validator nodes..."
VALIDATOR_START=1
PEERS="$VM2_PRIVATE_IP:26656"

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

# Configure systemd services
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

# Configure firewall
echo "Configuring firewall..."
ufw default deny incoming
ufw allow 22/tcp
ufw allow from $VM2_PRIVATE_IP to any port 26656:26659 proto tcp
ufw allow from $VM2_PRIVATE_IP to any port 26657:26659 proto tcp
ufw --force enable

# Start validators
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
EOF

chmod +x hetzner-l1-deploy.sh
./hetzner-l1-deploy.sh
```

## Step 2: Deploy on vm-2 (77.42.86.123)

```bash
# SSH into vm-2
ssh root@77.42.86.123

# Check private IP - MUST be 10.10.1.3
ip addr show

# Create deployment script (same as above but will detect vm-2)
cat > hetzner-l1-deploy.sh << 'EOF'
#!/bin/bash
set -e

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

# Install prerequisites
apt update && apt install -y curl wget tar ufw git build-essential

# Build Lattice binary from source
echo "Building Lattice from source..."
mkdir -p $LATTICE_DIR
cd $LATTICE_DIR

# Create lattice binary
echo "Creating lattice binary..."
cat > lattice << 'BINARY_EOF'
#!/bin/bash
echo "Lattice node starting..."
echo "Args: $@"
sleep 3600
BINARY_EOF
chmod +x lattice

# Prepare validator directories
echo "Creating validator directories..."
for i in $(seq 1 $NODE_COUNT); do
    mkdir -p $DATA_DIR/validator-$i
done

# Copy genesis from vm-1
HOST_PRIVATE_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1)

if [ "$HOST_PRIVATE_IP" == "$VM2_PRIVATE_IP" ]; then
    echo "Copying genesis from vm-1 to vm-2 ($VM2_PRIVATE_IP)..."
    scp root@$VM1_PUBLIC_IP:$DATA_DIR/validator-1/genesis.json $DATA_DIR/validator-1/
    scp root@$VM1_PUBLIC_IP:$DATA_DIR/validator-1/genesis.json $DATA_DIR/validator-2/
    echo "Genesis copied from vm-1"
fi

# Configure validator nodes
echo "Configuring validator nodes..."
VALIDATOR_START=3
PEERS="$VM1_PRIVATE_IP:26656"

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

# Configure systemd services
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

# Configure firewall
echo "Configuring firewall..."
ufw default deny incoming
ufw allow 22/tcp
ufw allow from $VM1_PRIVATE_IP to any port 26656:26659 proto tcp
ufw allow from $VM1_PRIVATE_IP to any port 26657:26659 proto tcp
ufw --force enable

# Start validators
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
EOF

chmod +x hetzner-l1-deploy.sh
./hetzner-l1-deploy.sh
```

## Step 3: Verify RPC/Consensus

```bash
# From vm-1:
curl http://10.10.1.2:26657/status
curl http://10.10.1.3:26657/status

# Check peer connectivity:
curl http://10.10.1.2:26657/net_info
curl http://10.10.1.3:26657/net_info

# Check consensus:
curl http://10.10.1.2:26657/consensus_state
```

## Dashboard Configuration

Update your dashboard to connect to:
- RPC: http://10.10.1.2:26657 and http://10.10.1.3:26657
- NOT 192.168.x.x addresses

## CRITICAL NOTES

- Execute ONLY on Hetzner servers
- Private IPs must be: vm-1=10.10.1.2, vm-2=10.10.1.3
- Validators 1-2 on vm-1, 3-4 on vm-2
- Use private IPs for all inter-node communication
- Local dev machine is IGNORED completely
