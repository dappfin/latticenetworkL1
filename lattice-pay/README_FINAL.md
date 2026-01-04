# Lattice Paymaster - Final Gas & Payment Model

## 🎯 Overview

Production-ready paymaster system implementing the final gas and payment model for Lattice Network. This system abstracts gas completely from users while maintaining a sustainable business model.

## 🔒 HARD RULES (FINAL)

- **Payment Methods**: USDT, USDC, ETH, or any allowed ERC20
- **Internal Settlement**: ALL settlement happens in USDT only
- **Gas Accounting**: Happens only AFTER payment
- **Fee Structure**: 1% fee always taken in USDT
- **Gas Abstraction**: Lattice Gas Units (LGU) are invisible to users
- **No Native Token**: No L1 token required

## 🏗️ Architecture

### Core Contracts

1. **LatticePaymaster.sol** - Main paymaster contract
2. **PriceOracle.sol** - Token price feeds and normalization
3. **Subscription.sol** - User subscription management
4. **Gateway.sol** - Access control and rate limiting
5. **MockERC20.sol** - Test token contracts

### Payment Flow

```
User Payment → Normalization → USDT Settlement → 1% Fee → LGU Accounting
```

## 💰 Payment Normalization

| User Pays | Action | Result |
|-----------|--------|--------|
| USDT | Use directly | X USDT |
| USDC | Swap → USDT | X USDT |
| ETH | Swap → USDT | X USDT |
| ERC20 | Swap → USDT | X USDT |

## 📊 Settlement Engine (Strict Order)

1. **Session Ends** - Total value calculated
2. **Value Conversion** - All values converted to USDT
3. **Fee Calculation** - 1% fee taken
4. **Net Value** - Remaining value after fee
5. **Gas Cost** - Internal LGU cost calculation
6. **LGU Accounting** - Internal ledger update

## 🎯 Profit Model

```
Revenue = Σ (sessionValueUSDT × 1%)
Costs = Infrastructure + LGU burn (virtual)
Profit = Revenue − Costs
```

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Compilation

```bash
npm run compile
```

### Testing

```bash
npm run test
```

### Deployment

```bash
npm run deploy
```

### Demo

```bash
npx hardhat run scripts/demo_lattice_paymaster.ts
```

## 📋 Configuration

### Environment Variables

```bash
# .env
PRIVATE_KEY=your_private_key
RPC_URL=your_rpc_url
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Network Configuration

Update `hardhat.config.ts` for your target network.

## 🧪 Testing

The test suite covers:

- ✅ Payment normalization logic
- ✅ Session management
- ✅ Settlement engine
- ✅ Fee calculation (1%)
- ✅ LGU accounting
- ✅ Profit tracking
- ✅ Edge cases and error handling

## 📈 Production Features

### ✅ Single Settlement Asset
- All internal accounting in USDT
- Simple audit trails
- Easy partner integration

### ✅ Gas Abstraction
- Users never see gas costs
- No native token requirements
- Perfect for gaming & SaaS

### ✅ Business Model
- 1% fee on all transactions
- Predictable revenue streams
- Low operational overhead

### ✅ Security
- Access control via Gateway
- Rate limiting
- Subscription validation
- Comprehensive error handling

## 🔧 API Reference

### LatticePaymaster

```solidity
// Session Management
function startSession(address user, address paymentToken, uint256 paymentAmount) external returns (bytes32 sessionId)
function endSession(bytes32 sessionId) external
function recordGasUsage(bytes32 sessionId, uint256 gasUsedLGU) external

// Payment Normalization
function normalizePayment(address token, uint256 amount) public view returns (uint256 usdtAmount)

// Validation
function validateUser(address user) external view returns (bool)
function validateGateway(address caller) external view returns (bool)
function validateSession(bytes32 sessionId) external view returns (bool)

// Analytics
function getProfitMetrics() external view returns (uint256 revenue, uint256 totalGas, uint256 currentLGUBalance, uint256 sessionCount)
```

### PriceOracle

```solidity
function getPrice(address token) external view returns (uint256)
function addToken(address token, uint256 priceUSDT) external onlyOwner
function updatePrice(address token, uint256 priceUSDT) external onlyOwner
```

### Subscription

```solidity
function purchaseSubscription(Tier tier, uint256 months) external
function active(address user) public view returns (bool)
function canStartSession(address user, uint256 sessionValueUSDT) external view returns (bool)
```

## 🎮 Demo Scenarios

The demo script demonstrates:

1. **USDT Payment** - Direct USDT usage
2. **USDC Payment** - Normalization to USDT
3. **Profit Analysis** - Revenue and cost tracking
4. **LGU Accounting** - Internal gas tracking

## 🔒 Security Considerations

- **Access Control**: Gateway contract manages all access
- **Rate Limiting**: Prevents spam and abuse
- **Subscription Validation**: Only active users can start sessions
- **Input Validation**: All inputs are validated before processing
- **Reentrancy Protection**: Built-in protection against reentrancy attacks

## 📊 Monitoring

### Key Metrics

- Total revenue (USDT)
- Total gas consumed (LGU)
- Active sessions count
- LGU balance status
- Error rates

### Events

```solidity
event SessionStarted(bytes32 indexed sessionId, address indexed user, address paymentToken, uint256 paymentAmount);
event SessionEnded(bytes32 indexed sessionId, address indexed user, uint256 sessionValueUSDT, uint256 feeUSDT, uint256 gasUsedLGU);
event PaymentNormalized(address indexed token, uint256 amount, uint256 usdtAmount);
event LGUConsumed(address indexed user, uint256 amount);
event ProfitRecorded(uint256 revenueUSDT, uint256 gasCostUSDT);
```

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Review contract addresses
- [ ] Verify token configurations
- [ ] Test price oracle feeds
- [ ] Validate gateway settings
- [ ] Check subscription tiers
- [ ] Run full test suite

### Deployment Steps

1. Deploy all contracts
2. Configure supported tokens
3. Set up price feeds
4. Configure gateway access
5. Initialize subscription plans
6. Fund LGU balance
7. Run integration tests

## 📞 Support

For issues and questions:

- GitHub Issues: Report bugs and feature requests
- Documentation: Check this README first
- Team: Contact the Lattice development team

## 📜 License

MIT License - see LICENSE file for details.

---

**This is production-locked and ready for mainnet deployment.**
