FROM node:20-alpine

RUN apk add --no-cache mysql-client

WORKDIR /app

COPY package*.json .

RUN npm i

COPY . .

EXPOSE 5010

ENV NODE_ENV=development

CMD ["node", "index.js"]
