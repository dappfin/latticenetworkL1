#!/bin/bash

echo "🚀 LatticePay Quick Start"
echo "========================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🔧 Available Commands:"
echo "======================"
echo ""
echo "📋 1. Deploy contracts:"
echo "   npx hardhat run scripts/deploy.ts --network localhost"
echo ""
echo "🎯 2. Test success paths:"
echo "   npx hardhat run scripts/test_success_paths.ts --network localhost"
echo ""
echo "🚪 3. Allowlist gateway:"
echo "   npx hardhat run scripts/allowlist_gateway.ts --network localhost"
echo ""
echo "💳 4. Test paymaster:"
echo "   npx hardhat run scripts/test_paymaster.ts --network localhost"
echo ""
echo "📝 5. Mint subscription:"
echo "   npx hardhat run scripts/mint_subscription.ts --network localhost"
echo ""
echo "🔍 6. Verify allowlist:"
echo "   npx hardhat run scripts/verify_allowlist.ts --network localhost"
echo ""
echo "⚙️  Setup:"
echo "   - Start local node: npx hardhat node"
echo "   - Update deployment addresses after running deploy.ts"
echo ""
echo "🎉 All scripts focus on SUCCESS paths only!"
echo "   Reverted/error paths are handled by contract logic."
