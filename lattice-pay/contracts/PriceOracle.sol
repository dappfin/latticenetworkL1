// contracts/PriceOracle.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
    function getUSDTPrice() external view returns (uint256);
}

contract PriceOracle is Ownable, IPriceOracle {
    // Price feeds (1e18 precision for token prices, converted to USDT 6 decimals)
    mapping(address => uint256) public tokenPrices; // Token price in USDT (1e12 precision)
    address[] public supportedTokens;
    
    // USDT address for reference
    address public immutable usdt;
    
    // Price confidence thresholds
    uint256 public constant MAX_PRICE_DEVIATION = 500; // 5% max deviation
    uint256 public constant PRICE_UPDATE_COOLDOWN = 1 hours;
    
    mapping(address => uint256) public lastPriceUpdate;
    
    // Events
    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);
    event TokenAdded(address indexed token, uint256 price);
    event TokenRemoved(address indexed token);
    event EmergencyPriceSet(address indexed token, uint256 price);
    
    constructor(address _usdt) Ownable(msg.sender) {
        usdt = _usdt;
        // Set USDT price to 1:1 (1e12 precision for USDT conversion)
        tokenPrices[_usdt] = 1 * 1e12; // 1 USDT = 1 USDT
        supportedTokens.push(_usdt);
        lastPriceUpdate[_usdt] = block.timestamp;
        emit TokenAdded(_usdt, 1 * 1e12);
    }
    
    function addToken(address token, uint256 priceUSDT) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(priceUSDT > 0, "Price must be greater than 0");
        require(tokenPrices[token] == 0, "Token already supported");
        
        supportedTokens.push(token);
        tokenPrices[token] = priceUSDT;
        lastPriceUpdate[token] = block.timestamp;
        
        emit TokenAdded(token, priceUSDT);
        emit PriceUpdated(token, priceUSDT, block.timestamp);
    }
    
    function updatePrice(address token, uint256 priceUSDT) external onlyOwner {
        require(tokenPrices[token] > 0, "Token not supported");
        require(priceUSDT > 0, "Price must be greater than 0");
        require(block.timestamp >= lastPriceUpdate[token] + PRICE_UPDATE_COOLDOWN, "Price update too soon");
        
        // Check for extreme price changes
        uint256 oldPrice = tokenPrices[token];
        uint256 deviation = priceUSDT > oldPrice ? 
            ((priceUSDT - oldPrice) * 10000) / oldPrice :
            ((oldPrice - priceUSDT) * 10000) / oldPrice;
        require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
        
        tokenPrices[token] = priceUSDT;
        lastPriceUpdate[token] = block.timestamp;
        
        emit PriceUpdated(token, priceUSDT, block.timestamp);
    }
    
    function removeToken(address token) external onlyOwner {
        require(token != usdt, "Cannot remove USDT");
        require(tokenPrices[token] > 0, "Token not supported");
        
        tokenPrices[token] = 0;
        lastPriceUpdate[token] = 0;
        // Remove from supportedTokens array (simplified - in production implement proper removal)
        
        emit TokenRemoved(token);
    }
    
    function getPrice(address token) external view returns (uint256) {
        uint256 price = tokenPrices[token];
        require(price > 0, "Token not supported");
        return price;
    }
    
    function getUSDTPrice() external pure returns (uint256) {
        return 1 * 1e12; // 1 USDT = 1 USDT (1e12 precision)
    }
    
    function isTokenSupported(address token) external view returns (bool) {
        return tokenPrices[token] > 0;
    }
    
    function getLastUpdateTime(address token) external view returns (uint256) {
        return lastPriceUpdate[token];
    }
    
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    // Batch price updates for efficiency
    function batchUpdatePrices(address[] memory tokens, uint256[] memory prices) external onlyOwner {
        require(tokens.length == prices.length, "Arrays length mismatch");
        require(tokens.length <= 50, "Batch too large");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 price = prices[i];
            
            require(tokenPrices[token] > 0, "Token not supported");
            require(price > 0, "Price must be greater than 0");
            require(block.timestamp >= lastPriceUpdate[token] + PRICE_UPDATE_COOLDOWN, "Price update too soon");
            
            // Check for extreme price changes
            uint256 oldPrice = tokenPrices[token];
            uint256 deviation = price > oldPrice ? 
                ((price - oldPrice) * 10000) / oldPrice :
                ((oldPrice - price) * 10000) / oldPrice;
            require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
            
            tokenPrices[token] = price;
            lastPriceUpdate[token] = block.timestamp;
            
            emit PriceUpdated(token, price, block.timestamp);
        }
    }
    
    // Emergency price update (bypasses cooldown and deviation checks)
    function emergencySetPrice(address token, uint256 priceUSDT) external onlyOwner {
        require(tokenPrices[token] > 0, "Token not supported");
        require(priceUSDT > 0, "Price must be greater than 0");
        
        tokenPrices[token] = priceUSDT;
        lastPriceUpdate[token] = block.timestamp;
        
        emit EmergencyPriceSet(token, priceUSDT);
        emit PriceUpdated(token, priceUSDT, block.timestamp);
    }
    
    // Production helper functions
    function getConversionRate(address token) external view returns (uint256) {
        // Returns the conversion rate from token to USDT (1e12 precision)
        return this.getPrice(token);
    }
    
 function normalizeAmount(address token, uint256 amount) external view returns (uint256 usdtAmount) {
        // Convert any token amount to USDT equivalent
        uint256 price = this.getPrice(token);
        return (amount * price) / 1e18;
    }
}
