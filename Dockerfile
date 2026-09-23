FROM node:20-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build
RUN mkdir -p /data
ENV DATABASE_URL="file:/data/prod.db"
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm start"]
