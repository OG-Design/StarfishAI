# **Starfish API**

## Table of Contents

1. [Intro](#intro)
2. [Prerequisites & compatibility](#prerequisites--compatibility)
3. [Getting started](#getting-started)
4. [How the API is structured](#how-the-api-is-structured)

### other docs
5. [How it works](./docs/NESTJS_BASICS.md)
6. [Authentication](./docs/AUTHENTICATION.md)
7. [Websocket connection](./docs/WEBSOCKETS.md)



# **Intro**
This api handles all traffic from the frontend, it handles ollama's api with history and saves and returns it to the user in a structured way. First we have a general overview of the [prerequisites & compatibility](#prerequisites--compatibility) which involves all the software and ports you need to run the API. Next is [Getting started](#getting-started) which helps you get up and running. Then we have a helpful diagram in [How the API is structured](#how-the-api-is-structured) that helps visualize the API's structure. In the [How it works](./docs/NESTJS_BASICS.md) docs you will get an overview and a general explanation of how parts of `NestJS` works. Further down you will find important parts of the API explained in separate docs, this includes things like [Authentication](./docs/AUTHENTICATION.md), [Websocket connection](./docs/WEBSOCKETS.md), more will be added at a later date.

# **Prerequisites & compatibility**

## Compatibility
**Important note:** Virtualization is important, the project may not run without it (untested), make sure your system supports it. There may be work arounds to this, but they are not recommended due to performance issues. If your system doesn't support virtualization you may want to download ollama natively instead: [ollama](https://ollama.com/)

Due to the previously mentioned importance of virtualization this may not run on certain chipsets like apple's `m1` chip.

## Ports needed
- `5173` -> for the webapp, Will make a config file: W.I.P 22.01.26
- `3000` -> for the API, Will make a config file: W.I.P 22.01.26

## Dependencies

- node.js -> version: v22.15.0 - v.24.13.0 (LTS) [Link](https://nodejs.org/en)
- npm: Node Package Manager -> version: 11.6.2 [Included in node](https://nodejs.org/en)
- docker [Link](https://www.docker.com/)
- docker-compose [Included in Docker Desktop on Windows & Mac](https://www.docker.com/)
- ollama [Link to docker image](https://hub.docker.com/r/ollama/ollama). Pull in terminal using: `docker pull ollama/ollama:0.15.3-rocm`

# **Getting started**

## Project setup

install node dependencies

```bash
$ npm install
```

## Make the Database

### Using sqlite studio

Run the content of this SQL script [starfish.db.sql](./starfish.db.sql) in `sqlite studio` or it's cli tools. Save it in the `../api-nest` folder.

## Make the `.env` files

### Run this file to generate the env files:
- [Windows](../generateENV-windows.bat)
- [Linux](../generateENV-linux.sh)

### Change the content of all the generated files based on your environment:

**Developement**
- [`.env`](../.env)
- [`.env.secret`](../.env.secret)

**Production**
- [`.env.production`](../.env.production)
- [`.env.secret.production`](../.env.secret.production)

## Run the API
By default this will run on port `:3000`, change this in [vite.config.ts](vite.config.ts) aswell as in the backends [PORT](../api-nest/src/main.ts). It also runs on `http://localhost`, so if you get cross origin problems try to change it in [vite.config.ts](vite.config.ts), aswell as in the backends [ADDRESS_HOST](../api-nest/src/chatevent/chatevent.gateway.ts)

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## How the API is structured:

## Diagram

![diagram for the API](./docs/APIDiagram.drawio.svg)

---

# In depth

- For more on how it works here is a [link to how it works](./docs/NESTJS_BASICS.md)
- For more on the `authentication` here is a [link to authentication](./docs/AUTHENTICATION.md)
- For more on `websockets` here is a [link to websockets](./docs/WEBSOCKETS.md)