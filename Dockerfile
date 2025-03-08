FROM node:18.18.0
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm i && npm cache clean --force
COPY . .

EXPOSE 5000
ENTRYPOINT ["npm", "run"]