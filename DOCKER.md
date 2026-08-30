# Dockerize VintageStream

This plan outlines the steps to fully Dockerize VintageStream into a single, cohesive container. This makes it incredibly easy for users to deploy it just like Plex or Jellyfin.

## Proposed Architecture

Instead of running two separate containers (one for React, one for Node), we will consolidate them into a single streamlined container. 

1. **Build Stage:** The Dockerfile will use a Node.js image to build the React frontend (`client/dist`).
2. **Production Stage:** The built React files will be copied into the `server/public` directory.
3. **Execution:** The Express backend will serve both the frontend UI and the backend API/Streaming routes from the same port.

This entirely eliminates CORS issues, simplifies the deployment to a single exposed port, and makes it incredibly lightweight.

## Changes Required

### 1. [NEW] `Dockerfile`
A multi-stage Dockerfile that builds the React frontend and then configures the production Node.js server.
- Base image: `node:18-alpine`
- System dependency: Installs `ffmpeg` via `apk` so hardware transcoding is instantly available out of the box.

### 2. [NEW] `docker-compose.yml`
A standard Docker Compose file that allows users to easily pass their TMDB API key and map their external media hard drive to the container's internal `/media` folder.

### 3. [NEW] `.dockerignore`
Prevents local `node_modules` and local `.env` files from being copied into the container context, keeping the build fast and clean.

## Verification Plan
1. Check the Dockerfile syntax.
2. Verify that Express serves from the `/public` directory (which it already does).
3. The user can then run `docker-compose up -d` to verify it works seamlessly on their host network.
