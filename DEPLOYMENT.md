# Hospital Management System - Deployment Guide

This guide covers deployment options and best practices for the Hospital Management System (HMS).

## Local Development Setup

### Prerequisites
- Node.js 22.13.0 or higher
- pnpm 10.4.1 or higher
- MySQL 8.0 or higher
- Docker and Docker Compose (optional, for containerized setup)

### Option 1: Direct Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hospital-management-system
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   pnpm drizzle-kit generate
   pnpm drizzle-kit migrate
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

### Option 2: Docker Compose (Recommended for Local Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hospital-management-system
   ```

2. **Create .env file**
   ```bash
   cp .env.example .env
   # Update with your configuration
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - phpMyAdmin: http://localhost:8080
   - MySQL: localhost:3306

5. **View logs**
   ```bash
   docker-compose logs -f app
   ```

6. **Stop services**
   ```bash
   docker-compose down
   ```

## Production Deployment

### Environment Variables

Set these environment variables in production:

```bash
# Database
DATABASE_URL=mysql://user:password@host:3306/hms_db

# Authentication
JWT_SECRET=<strong-random-secret>
VITE_APP_ID=<your-app-id>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=<your-api-key>

# Application
NODE_ENV=production
PORT=3000
```

### Option 1: Cloud Run (Google Cloud)

1. **Build Docker image**
   ```bash
   docker build -t gcr.io/PROJECT_ID/hms:latest .
   docker push gcr.io/PROJECT_ID/hms:latest
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy hms \
     --image gcr.io/PROJECT_ID/hms:latest \
     --platform managed \
     --region us-central1 \
     --set-env-vars DATABASE_URL=<your-db-url>
   ```

### Option 2: Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Create Heroku app**
   ```bash
   heroku create hms-app
   ```

3. **Set environment variables**
   ```bash
   heroku config:set DATABASE_URL=<your-db-url>
   heroku config:set JWT_SECRET=<your-secret>
   # Set other variables...
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 3: AWS Elastic Beanstalk

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize Elastic Beanstalk**
   ```bash
   eb init -p "Node.js 22 running on 64bit Amazon Linux 2" hms-app
   ```

3. **Create environment**
   ```bash
   eb create hms-env
   ```

4. **Set environment variables**
   ```bash
   eb setenv DATABASE_URL=<your-db-url> JWT_SECRET=<your-secret>
   ```

5. **Deploy**
   ```bash
   eb deploy
   ```

### Option 4: Self-Hosted (VPS/Dedicated Server)

1. **SSH into server**
   ```bash
   ssh user@your-server.com
   ```

2. **Install Node.js and dependencies**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   npm install -g pnpm
   ```

3. **Clone repository**
   ```bash
   git clone <repository-url>
   cd hospital-management-system
   ```

4. **Install and build**
   ```bash
   pnpm install
   pnpm build
   ```

5. **Set up systemd service**
   ```bash
   sudo nano /etc/systemd/system/hms.service
   ```

   Add:
   ```ini
   [Unit]
   Description=Hospital Management System
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/home/user/hospital-management-system
   ExecStart=/usr/bin/node dist/index.js
   Restart=on-failure
   RestartSec=10
   Environment="NODE_ENV=production"
   Environment="DATABASE_URL=mysql://..."

   [Install]
   WantedBy=multi-user.target
   ```

6. **Start service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable hms
   sudo systemctl start hms
   ```

7. **Set up Nginx reverse proxy**
   ```bash
   sudo apt-get install nginx
   sudo nano /etc/nginx/sites-available/hms
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Enable SSL with Let's Encrypt**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Database Setup

### MySQL

1. **Create database**
   ```sql
   CREATE DATABASE hms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'hms_user'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT ALL PRIVILEGES ON hms_db.* TO 'hms_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Run migrations**
   ```bash
   pnpm drizzle-kit migrate
   ```

### Backup and Recovery

1. **Create backup**
   ```bash
   mysqldump -u hms_user -p hms_db > backup.sql
   ```

2. **Restore from backup**
   ```bash
   mysql -u hms_user -p hms_db < backup.sql
   ```

## Monitoring and Maintenance

### Health Checks

The application exposes a health check endpoint at `/health`:

```bash
curl http://localhost:3000/health
```

### Logging

Logs are written to:
- Console (development)
- File: `logs/app.log` (production)

### Performance Monitoring

1. **Enable slow query logging**
   ```sql
   SET GLOBAL slow_query_log = 'ON';
   SET GLOBAL long_query_time = 2;
   ```

2. **Monitor application metrics**
   - Response times
   - Error rates
   - Database query performance
   - Memory usage

### Scaling Considerations

1. **Horizontal Scaling**
   - Use load balancer (Nginx, HAProxy)
   - Deploy multiple instances
   - Use shared database

2. **Vertical Scaling**
   - Increase server resources
   - Optimize database queries
   - Implement caching (Redis)

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets to version control
   - Use strong, unique JWT secrets
   - Rotate API keys regularly

2. **Database Security**
   - Use strong passwords
   - Enable SSL connections
   - Restrict network access
   - Regular backups

3. **Application Security**
   - Keep dependencies updated
   - Enable HTTPS/TLS
   - Implement rate limiting
   - Use security headers

4. **Access Control**
   - Implement role-based access control
   - Use OAuth for authentication
   - Enable two-factor authentication
   - Audit user access

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
mysql -u hms_user -p -h localhost hms_db

# Check connection string
echo $DATABASE_URL
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Out of Memory

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=2048" node dist/index.js
```

### SSL Certificate Issues

```bash
# Renew Let's Encrypt certificate
sudo certbot renew --dry-run
sudo certbot renew
```

## Rollback Procedure

If deployment fails:

1. **Check logs**
   ```bash
   docker-compose logs app
   # or
   systemctl status hms
   journalctl -u hms -n 50
   ```

2. **Rollback to previous version**
   ```bash
   git revert HEAD
   pnpm build
   systemctl restart hms
   ```

3. **Restore database from backup**
   ```bash
   mysql -u hms_user -p hms_db < backup.sql
   ```

## Support

For deployment issues or questions, refer to:
- [README.md](./README.md) - Project overview
- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [Database Schema](./docs/DATABASE.md)
