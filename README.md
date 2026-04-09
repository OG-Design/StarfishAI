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

# W.I.P

- System section inside settings.
- Mobile UI optimisation.
- Auto update model selector with new models.
- Make model selector completely viewable on every system.

# Backlog

- Complete redis integration.
- Add vision.
- Add TTS.
- Integrate other AI technology into the project.


# **Getting started**


## 1. Install dependencies

1. Navigate to [./api-nest/](./api-nest/).
2. Type `npm install` to install dependencies.
3. Navigate to [./webapp/](./webapp/).
4. Type `npm install` to install dependencies.

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

# 3.
.read "./starfish.db.sql"
```

## 3. Generate the environment variables

Use the scripts provided to generate the `.env` files.

[Windows](./generateENV-windows.bat)
```bash
./generateENV-windows.bat
```

[Linux](./generateENV-linux.sh)
```bash
./generateENV-linux.sh
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

To run the project you have two main ways of doing it, using the script provided:
```bash
# Windows
./run.bat
```
or run them seperately:
```bash
# WebApp
cd ./webapp
npm run dev

# API
cd ./api-nest
npm run start:dev

# Ollama
cd ./ollama
docker-compose up -d

# Redis. Not implemented yet, but required to run.
cd ./redis
docker-compose up -d
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