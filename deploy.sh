#!/bin/bash
# deploy.sh - Simple deployment script for BINGO E-commerce
# Usage: ./deploy.sh [environment]
# Example: ./deploy.sh production

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default environment is production
ENVIRONMENT=${1:-production}
echo -e "${YELLOW}Deploying to ${ENVIRONMENT} environment...${NC}"

# 1. Run pre-deployment checks
echo -e "\n${YELLOW}Running pre-deployment checks...${NC}"
./scripts/pre-deployment-check.sh
if [ $? -ne 0 ]; then
  echo -e "${RED}Pre-deployment checks failed. Please fix the issues before deploying.${NC}"
  exit 1
fi

# 2. Build and optimize assets
echo -e "\n${YELLOW}Building and optimizing assets...${NC}"
npm run optimize
if [ $? -ne 0 ]; then
  echo -e "${RED}Asset optimization failed.${NC}"
  exit 1
fi

# 3. Backup database
echo -e "\n${YELLOW}Creating database backup...${NC}"
BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
cp database.sqlite "database_backup_${BACKUP_DATE}.sqlite"
echo -e "${GREEN}Database backed up to database_backup_${BACKUP_DATE}.sqlite${NC}"

# 4. Git operations
echo -e "\n${YELLOW}Committing changes...${NC}"
git add .
git status

echo -e "\n${YELLOW}Enter commit message:${NC}"
read COMMIT_MESSAGE

git commit -m "$COMMIT_MESSAGE"
if [ $? -ne 0 ]; then
  echo -e "${RED}Git commit failed.${NC}"
  exit 1
fi

echo -e "\n${YELLOW}Pushing changes to remote repository...${NC}"
git push origin main
if [ $? -ne 0 ]; then
  echo -e "${RED}Git push failed.${NC}"
  exit 1
fi

# 5. Deployment based on environment
if [ "$ENVIRONMENT" == "production" ]; then
  echo -e "\n${YELLOW}Deploying to production...${NC}"
  
  # If using Netlify
  if command -v netlify &> /dev/null; then
    echo -e "Deploying to Netlify..."
    netlify deploy --prod
  # If using Heroku as fallback
  elif command -v heroku &> /dev/null; then
    echo -e "Deploying to Heroku..."
    heroku git:remote -a bingo-ecommerce
    git push heroku main
  else
    echo -e "${YELLOW}Neither Netlify nor Heroku CLI found. Manual deployment may be required.${NC}"
  fi
  
elif [ "$ENVIRONMENT" == "staging" ]; then
  echo -e "\n${YELLOW}Deploying to staging...${NC}"
  # Deploy to Netlify draft URL
  if command -v netlify &> /dev/null; then
    echo -e "Deploying to Netlify (draft)..."
    netlify deploy
  fi
fi

echo -e "\n${GREEN}Deployment completed successfully!${NC}"
echo -e "Please verify your changes at your deployed website."
