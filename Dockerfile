FROM node:18.17.1
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm i && npm cache clean --force
COPY . .

EXPOSE 5000
ENTRYPOINT ["npm", "run"]