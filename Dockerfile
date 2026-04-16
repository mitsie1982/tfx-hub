# Pin Docker environment for reproducibility
FROM node:18-alpine
# Set workdir
WORKDIR /app
# Install pnpm
RUN npm install -g pnpm
# Copy all workspace files
COPY . .
# Install dependencies using pnpm
ENV CI=true
RUN pnpm install --no-frozen-lockfile --prod
ENV NODE_ENV=production
ENV DEMO_MODE=true
CMD ["sh", "-c", "node seed-demo.js || true && node server.js"]
