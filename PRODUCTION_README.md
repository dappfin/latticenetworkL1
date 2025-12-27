# Lattice Network L1 - Production Setup

## System Status

### ✅ Core Components
- **Key Management**: All keys loaded correctly
- **Process Management**: PM2 manages validators with auto-restart
- **Transaction Processing**: Mempool handles transactions end-to-end
- **Network**: Connectivity and block production verified
- **Data**: Persistent storage and backups working
- **Monitoring**: Latency tracking is functioning perfectly

## Deployment Guide

### Prerequisites
- Node.js (v16+)
- PM2 (for process management)
- Redis (for mempool and caching)
- PostgreSQL (for persistent storage)
- Backup storage solution (e.g., AWS S3, GCP Storage)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd latticenetworkL1

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

1. Copy the example environment file and update with your production values:
   ```bash
   cp .env.example .env
   ```

2. Update the following environment variables in `.env`:
   ```env
   NODE_ENV=production
   REDIS_URL=redis://localhost:6379
   DATABASE_URL=postgresql://user:password@localhost:5432/lattice_prod
   BACKUP_BUCKET=your-s3-bucket-name
   ```

### PM2 Setup

1. Start the application using PM2:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

2. Configure PM2 to start on system boot:
   ```bash
   pm2 startup
   pm2 save
   ```

### Backup Configuration

1. Set up regular database backups using `pg_dump` and your preferred storage solution.
2. Configure log rotation for application logs.

## Monitoring and Maintenance

### Health Checks
- API Health: `GET /health`
- Database Connection: `GET /health/db`
- Redis Connection: `GET /health/redis`

### Logs
View logs using PM2:
```bash
# View all logs
pm2 logs

# View logs for a specific app
pm2 logs app-name
```

### Updating the Application

1. Pull the latest changes:
   ```bash
   git pull origin main
   npm install
   npm run build
   ```

2. Restart the application:
   ```bash
   pm2 restart all
   ```

## Scaling

### Horizontal Scaling
- Add more validator nodes behind a load balancer
- Use Redis Cluster for distributed caching
- Consider sharding for high transaction throughput

### Performance Optimization
- Enable compression for API responses
- Cache frequently accessed data
- Optimize database queries and add indexes as needed

## Security

### Best Practices
- Use HTTPS for all API endpoints
- Implement rate limiting
- Regularly update dependencies
- Monitor for security vulnerabilities

## Support

For production support, contact:
- **Email**: support@lattice.network
- **Status Page**: [status.lattice.network](https://status.lattice.network)

## License

[Your License Here]
