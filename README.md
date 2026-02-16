# Starfish 

Starfish is an AI app that allows multiple users to use AI locally. You can chat with AI models with context of the thread, you can download models through the frontend settings, etc.

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