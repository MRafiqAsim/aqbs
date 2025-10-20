# Frontend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Set environment variable for API URL
ENV NEXT_PUBLIC_API_URL=http://localhost:8000

# Run the application in development mode
CMD ["npm", "run", "dev"]
