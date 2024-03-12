FROM node:latest

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build

ENTRYPOINT [ "node",  "dist/main.js" ]