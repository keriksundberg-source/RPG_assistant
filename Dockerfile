# One-stage build & run
FROM node:20-slim

# ffmpeg behövs i runtime (prism-media)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installera dev-deps för att kunna köra tsc
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || npm i

COPY . .
# bygga TypeScript -> dist
RUN npm run build

# trimma bort dev-deps i containern
RUN npm prune --omit=dev

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
