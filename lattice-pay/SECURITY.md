# Security Configuration Guide

## Environment Setup

### Development
```bash
cp .env.example .env
# Edit .env with your local values
```

### Production
```bash
# Use secret management service
export GATEWAY_REGISTRY=$(aws secretsmanager get-secret-value --secret-id gateway-registry --query SecretString)
export RPC_URL=$(aws secretsmanager get-secret-value --secret-id rpc-url --query SecretString)
export PRIVATE_KEY=$(aws secretsmanager get-secret-value --secret-id deployer-key --query SecretString)
```

## Security Best Practices

1. **Never commit** `.env` files or private keys
2. **Use different** RPC endpoints for each environment
3. **Rotate keys** regularly in production
4. **Monitor** for unauthorized access
5. **Use** hardware wallets for critical operations

## Secret Management Services

- **AWS Secrets Manager**
- **HashiCorp Vault** 
- **Google Secret Manager**
- **Azure Key Vault**

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Secrets loaded from secure service
- [ ] RPC endpoints verified
- [ ] Contract addresses confirmed
- [ ] Access controls enabled
