# Starfish 

Starfish is an AI app that allows multiple users to use AI locally. You can chat with AI models with context of the thread, you can download models through the frontend settings, etc.

# Features

- A prompt area to send and view AI responses.
- Thread selector, editor and deleter
- AI personality.
- Model selector.
- Settings menu.
- Model downloader.
- Profile menu.
- A local and remote mode.
- Redis integration for JWT authentication.
- AI Vision and file sharing.
- Basic TTS.

# W.I.P

- Mobile UI optimisation.
- Expanded TTS (tts options)

# Backlog

- Integrate other AI technology into the project.
- Change user's password, verify emails.
- Administrator interface.

# **Getting started**


## 1. Install dependencies

To install all dependencies type the command below
```bash
npm run install:all
```

## 2. Generate the Database

Generate your Database using this script: [link](./api-nest/starfish.db.sql)

Use either sqlite-studio or sqlite-tools to generate the db. You can install sqlite here: [Link](https://sqlite.org/)

### Generate using terminal
```bash
# sqlite3
# 1.
cd ./api-nest

# 2.
sqlite3 starfish.db

# 3. in sqlite3 cli
.read "./starfish.db.sql"
```

## 3. Build the project

In project root run the build command

```bash
npm run build
```

## 4 Install Docker

You can install docker here: [Link](https://www.docker.com/)

Start the docker engine:
```bash
# linux deb with systemctl

# single start
sudo systemctl start docker

# auto start on boot
sudo systemctl enable docker
```


## 5. Run the project

To run the project in docker do:

```bash
# This builds the docker image for webapp+api in app-compose and runs that & the compose file in the project root
npm run docker:start:all
```

## api-nest

[Link to api documentation](./api-nest/README.md)

## webapp

[Link to webapp documentation](./webapp/README.md)

---

## HTTPS / SSL Configuration

The project supports both HTTP and HTTPS. This is controlled by the `SECURE` and `HOST` variables in your `.env` files.

### HTTP (default for development)

No extra setup needed. With `SECURE=false` in `.env`, everything runs over plain HTTP:

```env
SECURE=false
HOST=localhost
VITE_SECURE=false
VITE_HOST=localhost
VITE_API_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

Access the app at `http://localhost`.

### HTTPS

1. **Generate or provide SSL certificates**

   Place `cert.pem` and `key.pem` in [`proxy/nginx-volume/ssl/`](./proxy/nginx-volume/ssl/). See the [SSL README](./proxy/nginx-volume/ssl/README.md) for generation instructions.


   Quick self-signed cert (Linux/macOS):



   ```bash
   cd proxy/nginx-volume/ssl
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout key.pem -out cert.pem -subj "/CN=localhost"
   ```

   Windows (PowerShell, requires Git):
   ```powershell
   cd proxy\nginx-volume\ssl
   & "C:\Program Files\Git\usr\bin\openssl.exe" req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "/CN=localhost"
   ```

2. **Update `.env`**

   ```env
   SECURE=true
   HOST=localhost          # or your domain
   VITE_SECURE=true
   VITE_HOST=localhost
   VITE_API_URL=https://localhost
   ALLOWED_ORIGINS=https://localhost,http://localhost:5173,http://localhost:3000
   ```

3. **Restart the stack**

   ```bash
   npm run docker:restart
   ```

   Or stop and start separately:
   ```bash
   npm run docker:stop
   npm run docker:run:all
   ```

   Nginx will serve HTTPS on ports **443** and **444** alongside HTTP on port **80**.

> **Note:** Browsers will show a certificate warning for self-signed certs — this is expected in development. For production, use certificates from a trusted CA (e.g. Let's Encrypt).

### What `SECURE` controls

| Component | `SECURE=false` | `SECURE=true` |
|-----------|---------------|--------------|
| **Session cookies** | `secure: false`, `sameSite: lax` | `secure: true`, `sameSite: lax` (or `none` for cross-origin) |
| **JWT / refresh cookies** | `secure: false` | `secure: true` |
| **Nginx** | HTTP only (port 80) | HTTP (80) + HTTPS (443, 444) |
| **WebSocket** | `ws://` | `wss://` (automatic) |