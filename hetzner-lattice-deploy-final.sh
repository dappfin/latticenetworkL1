#!/bin/bash
set -e

# -----------------------------
# CONFIGURATION (Hetzner real IPs)
# -----------------------------
LATTICE_VERSION="v1.0.0"            # replace with actual release URL
LATTICE_DIR="/opt/lattice"
DATA_DIR="/var/lib/lattice"
NODE_COUNT=2                         # validators per server

# Private network IPs
VM1_IP="10.10.1.2"
VM2_IP="10.10.1.3"

# -----------------------------
# 1️⃣ Install prerequisites
# -----------------------------
apt update && apt install -y curl wget tar ufw

# -----------------------------
# 2️⃣ Download and install Lattice binary
# -----------------------------
mkdir -p $LATTICE_DIR
cd $LATTICE_DIR
curl -L https://example.com/lattice-${LATTICE_VERSION}-linux-amd64.tar.gz -o lattice.tar.gz
tar -xzf lattice.tar.gz
chmod +x lattice
rm lattice.tar.gz

# -----------------------------
# 3️⃣ Prepare validator directories
# -----------------------------
for i in $(seq 1 $NODE_COUNT); do
    mkdir -p $DATA_DIR/validator-$i
done

# -----------------------------
# 4️⃣ Initialize genesis (only vm-1)
# -----------------------------
HOST_IP=$(hostname -I | awk '{print $1}')
if [ "$HOST_IP" == "$VM1_IP" ]; then
    echo "Initializing genesis on vm-1..."
    $LATTICE_DIR/lattice init --home $DATA_DIR/validator-1 --genesis
    cp $DATA_DIR/validator-1/genesis.json $DATA_DIR/validator-2/
fi

# -----------------------------
# 5️⃣ Copy genesis (vm-2 only)
# -----------------------------
if [ "$HOST_IP" == "$VM2_IP" ]; then
    scp root@$VM1_IP:$DATA_DIR/validator-1/genesis.json $DATA_DIR/validator-1/
    scp root@$VM1_IP:$DATA_DIR/validator-1/genesis.json $DATA_DIR/validator-2/
fi

# -----------------------------
# 6️⃣ Configure systemd services for both validators
# -----------------------------
for i in $(seq 1 $NODE_COUNT); do
cat > /etc/systemd/system/lattice-validator-$i.service <<EOF
[Unit]
Description=Lattice Validator $i
After=network.target

[Service]
Type=simple
User=root
ExecStart=$LATTICE_DIR/lattice start --home $DATA_DIR/validator-$i
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable lattice-validator-$i
    systemctl start lattice-validator-$i
done

# -----------------------------
# 7️⃣ Firewall — allow SSH + private network validator ports only
# -----------------------------
ufw default deny incoming
ufw allow 22/tcp
ufw allow from 10.10.0.0/16 to any port 26656,26657 proto tcp
ufw --force enable

echo "✅ Lattice validators deployed and running on this server."
echo "✅ SSH always allowed, 24/7 validators, private network, RPC ready"
