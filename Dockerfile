FROM node:23.10.0-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

# This should be CMD, not RUN
CMD ["npm", "run", "start"]