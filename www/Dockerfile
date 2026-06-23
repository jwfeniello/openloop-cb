FROM node:alpine

ARG NEXT_PUBLIC_MEDIA_URL
ENV NEXT_PUBLIC_MEDIA_URL=$NEXT_PUBLIC_MEDIA_URL

RUN mkdir -p /app/www

COPY . /app/www/

WORKDIR /app/www

RUN npm install

RUN npm run build

EXPOSE 3000

CMD [ "npm", "start" ]