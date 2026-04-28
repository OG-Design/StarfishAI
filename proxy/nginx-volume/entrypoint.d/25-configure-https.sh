#!/bin/sh
set -e

# This script runs during nginx container startup (after envsubst template processing).
# It generates local HTTPS server blocks only when:
#   - SECURE=true
#   - USE_EXTERNAL_SSL!=true
#   - SSL certificates exist

if [ "$SECURE" = "true" ] && [ "$USE_EXTERNAL_SSL" != "true" ] && [ -f /etc/nginx/ssl/cert.pem ] && [ -f /etc/nginx/ssl/key.pem ]; then
    cat > /etc/nginx/conf.d/ssl.conf << 'EOF'
# Auto-generated HTTPS configuration (SECURE=true)

# HTTPS on port 443
server {
    listen 443 ssl;
    client_max_body_size 500m;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTPS on port 444 (alternate)
server {
    listen 444 ssl;
    client_max_body_size 500m;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    echo "25-configure-https.sh: SSL configuration generated (ports 443, 444)"
elif [ "$SECURE" = "true" ] && [ "$USE_EXTERNAL_SSL" = "true" ]; then
    echo "25-configure-https.sh: USE_EXTERNAL_SSL=true, skipping local SSL config (expecting external TLS termination)"
else
    echo "25-configure-https.sh: local SSL not enabled (SECURE=${SECURE:-unset}, USE_EXTERNAL_SSL=${USE_EXTERNAL_SSL:-unset}) or certs not found, skipping"
fi
