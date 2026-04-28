FROM node:20-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package.json package-lock.json .
RUN npm install --production
COPY src ./src
EXPOSE 3001
CMD ["node", "src/index.js"]
