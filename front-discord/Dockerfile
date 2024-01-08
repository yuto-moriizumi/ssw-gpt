FROM node:18-alpine
WORKDIR /usr/app
COPY package.json ./package.json
RUN npm i
COPY . ./
CMD ["npm", "run", "start"]