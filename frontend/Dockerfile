# Frontend Dockerfile for KBEX.io
FROM node:18-alpine AS builder

WORKDIR /app

# Install native build dependencies for packages like @trezor/connect-web (usb)
RUN apk add --no-cache python3 make g++ linux-headers eudev-dev

# Copy package files
COPY package.json ./
COPY package-lock.json* ./
COPY yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile --ignore-optional 2>/dev/null || yarn install --ignore-optional || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build argument for API URL
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Build the application with CI=false to ignore warnings
ENV CI=false
RUN npm run build

# Copy TinyMCE assets to build folder
RUN cp -r node_modules/tinymce build/tinymce

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
