# SSL Certificates

Place your SSL certificate files here for HTTPS support:

- `cert.pem` — SSL certificate (or fullchain)
- `key.pem` — SSL private key

## Generate self-signed certs for development

**Linux / macOS:**
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/CN=localhost"
```

**Windows (PowerShell — uses Git's bundled openssl):**
```powershell
& "C:\Program Files\Git\usr\bin\openssl.exe" req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "/CN=localhost"
```

For production, use certificates from a trusted CA (e.g. Let's Encrypt).
