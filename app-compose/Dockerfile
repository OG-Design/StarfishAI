ARG NODE_VERSION=24.13.0

FROM node:${NODE_VERSION}-alpine

ARG PORT=3000

RUN mkdir /StarfishAI && mkdir /StarfishAI/api-nest && mkdir /StarfishAI/webapp

WORKDIR /StarfishAI/api-nest

COPY api-nest/package*.json ./
RUN npm install

COPY api-nest/. ./

COPY webapp /StarfishAI/webapp

RUN node -v

RUN ls; ls /StarfishAI

CMD [ "npm", "run", "start" ]

EXPOSE 3000