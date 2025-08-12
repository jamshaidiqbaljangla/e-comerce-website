# BINGO E-commerce Production Deployment Checklist

## 🔄 Pre-Deployment Tasks

- [ ] Run security checks: `node scripts/pre-deployment-check.sh`
- [ ] Make sure all environment variables are set in `.env.production`
- [ ] Run optimization scripts: `npm run optimize`
- [ ] Test the optimized assets locally
- [ ] Check image optimization is working properly
- [ ] Backup the SQLite database: `cp database.sqlite database.sqlite.backup`
- [ ] Update the version in `package.json`

## 🔒 Security Tasks

- [ ] Ensure JWT_SECRET is a strong, random string
- [ ] Verify all API endpoints are protected with proper authentication
- [ ] Make sure sensitive files are in `.gitignore`
- [ ] Set secure password policies for admin users
- [ ] Enable HTTPS in production environment

## 🚀 Deployment Options

### Heroku Deployment
- [ ] Create Heroku app: `heroku create bingo-ecommerce`
- [ ] Add PostgreSQL: `heroku addons:create heroku-postgresql:hobby-dev`
- [ ] Set environment variables: `heroku config:set JWT_SECRET=your_secret NODE_ENV=production`
- [ ] Deploy code: `git push heroku main`
- [ ] Run database migration: `heroku run node scripts/migrate-to-postgres.js`
- [ ] Set up auto-deployment from GitHub if needed

### VPS Deployment
- [ ] Configure Nginx as reverse proxy
- [ ] Set up SSL with Let's Encrypt
- [ ] Install PM2: `npm install pm2 -g`
- [ ] Create PM2 ecosystem file
- [ ] Configure database backups
- [ ] Set up monitoring and alerts

## 📊 Post-Deployment Checks

- [ ] Verify website loads properly
- [ ] Test login functionality
- [ ] Confirm image uploads work and optimize automatically
- [ ] Test shopping cart and checkout flow
- [ ] Check admin panel functionality
- [ ] Monitor server logs for any errors
- [ ] Verify SSL certificate is working correctly

## 🔧 Performance Monitoring

- [ ] Set up application monitoring (New Relic, Datadog, etc.)
- [ ] Configure error tracking (Sentry, Rollbar, etc.)
- [ ] Set up uptime monitoring
- [ ] Monitor database performance
- [ ] Set up automated backups

## 🔄 Regular Maintenance

- [ ] Schedule database backups
- [ ] Plan for periodic dependency updates
- [ ] Set up security vulnerability scanning
- [ ] Monitor disk space usage for uploads
- [ ] Create a rollback plan for emergencies
