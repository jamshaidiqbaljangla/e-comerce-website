#!/bin/bash

echo "🔒 Running pre-deployment security checks..."

# Check for .env files in version control
if [ -f .env ]; then
  echo "⚠️  WARNING: .env file found. Make sure it's in .gitignore"
fi

# Check for hardcoded secrets
echo "🔍 Checking for hardcoded secrets..."
grep -r "password\|secret\|token" --include="*.js" . | grep -v "node_modules"

# Check if node_modules is in .gitignore
if ! grep -q "node_modules" .gitignore 2>/dev/null; then
  echo "⚠️  WARNING: node_modules should be in .gitignore"
fi

# Check for outdated packages with known vulnerabilities
echo "📦 Checking for package vulnerabilities..."
npm audit

echo "✅ Security checks completed."
