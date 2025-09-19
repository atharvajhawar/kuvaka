FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies for building
RUN npm install --save-dev typescript @types/node

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create necessary directories
RUN mkdir -p uploads exports logs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]