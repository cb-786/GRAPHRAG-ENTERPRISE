FROM node:20-alpine

WORKDIR /app

# Install deps first (cache layer)
COPY package*.json ./
RUN npm install

# Copy source — volume-mount overrides this in dev
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]