FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY tag-job.js ./
USER node
CMD ["node", "tag-job.js"]
