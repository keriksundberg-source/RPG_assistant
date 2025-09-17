# Use Node with ffmpeg available
FROM node:20-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci --omit=dev || npm i --omit=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]