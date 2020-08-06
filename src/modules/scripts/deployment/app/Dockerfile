FROM node:10-alpine

#RUN mkdir -p /app

#COPY package.json /app

git clone https://github.com/carmel-6000/pumba app

WORKDIR /app

RUN npm install

RUN npm run build

RUN cp build/index.html build/index.ejs

RUN find build/. -type f -name "*.map" |xargs rm

#run apk add mysql mysql-client
#run npm install

CMD ["node", "server/server.js"]
