FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm install --loglevel=error
COPY . .
EXPOSE 3000
CMD ["node", "--no-deprecation", "index.js"]