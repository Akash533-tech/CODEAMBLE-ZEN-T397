FROM node:20-alpine AS base

WORKDIR /app

# Install all dependencies (including sequelize-cli needed for migrations)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Make entrypoint executable
RUN chmod +x entrypoint.sh

EXPOSE 5001

ENTRYPOINT ["sh", "entrypoint.sh"]
