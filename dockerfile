# ---------- BUILD STAGE ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------- PRODUCTION STAGE ----------
FROM nginx:alpine

# Borra config default
RUN rm /etc/nginx/conf.d/default.conf

# Config nginx simple para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia el build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]