#!/bin/bash
# Generate a secure AUTH_SECRET for NextAuth
# Usage: ./generate-auth-secret.sh

echo "Generating AUTH_SECRET for NextAuth..."
echo ""
echo "AUTH_SECRET=$(openssl rand -base64 32)"
echo ""
echo "Add this to your .env file or docker-compose.yml environment variables"
