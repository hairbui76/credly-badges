FROM node:20-slim

# Install chrome browser for puppeteer
RUN npx puppeteer browsers install chrome

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy app files
COPY . .

# Run the action
ENTRYPOINT ["node", "/app/index.js"]