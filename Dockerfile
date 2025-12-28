FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install root dependencies (including devDependencies for building)
RUN npm ci

# Install frontend dependencies (using npm install to handle lock file sync issues)
RUN cd frontend && npm install

# Copy application code
COPY . .

# Build frontend React app
RUN cd frontend && npm run build

# Remove frontend node_modules and devDependencies to reduce image size
RUN rm -rf frontend/node_modules && \
    rm -rf node_modules && \
    npm ci --only=production

# Create necessary directories
RUN mkdir -p data logs

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]

