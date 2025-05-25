FROM node:23.10.0-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm ci

# Bundle app source
COPY . .

# This should be CMD, not RUN
CMD ["npm", "run", "start"]