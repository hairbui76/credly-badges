FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to install git
USER root

# Install git for committing changes
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Create action directory
WORKDIR /action

# Copy package files
COPY package*.json ./

# Install additional npm packages (actions toolkit)
RUN npm ci --production

# Copy action files
COPY . .

# Set the entrypoint
ENTRYPOINT ["node", "/action/index.js"]