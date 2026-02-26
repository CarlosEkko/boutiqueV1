# Frontend Dockerfile for KBEX.io
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files (yarn.lock is optional)
COPY package.json ./
COPY yarn.lock* ./

# Install dependencies (using --network-timeout for slow connections)
RUN yarn install --network-timeout 100000 --frozen-lockfile || yarn install --network-timeout 100000

# Copy source code
COPY . .

# Build argument for API URL
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Build the application
RUN yarn build

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
