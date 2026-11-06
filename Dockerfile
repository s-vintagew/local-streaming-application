# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup the Node.js backend
FROM node:18-alpine
LABEL version="v_5"
WORKDIR /app

# Install FFmpeg for video transcoding
RUN apk update && apk add --no-cache ffmpeg

# Copy server package and install production dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production

# Copy backend source code
COPY server/ ./

# Copy built frontend from Stage 1 into the server's public directory
COPY --from=frontend-build /app/client/dist ./public

# Ensure the thumbnails directory exists with correct permissions.
# Subtitle files are read from the media mount. Converted WebVTT is cached separately
# because that mount is read-only.
RUN mkdir -p ./public/thumbnails /tmp/vintagestream-subs \
  && chmod -R 777 ./public/thumbnails /tmp/vintagestream-subs

# Default Environment Variables
ENV PORT=6000
ENV MEDIA_PATH=/media
ENV SUB_CACHE_DIR=/tmp/vintagestream-subs
ENV NODE_ENV=production

EXPOSE 6000

# Start the application
CMD ["npm", "start"]
