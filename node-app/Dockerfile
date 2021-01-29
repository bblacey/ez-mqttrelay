FROM node:15-alpine

LABEL com.blacey.maintainer="bruce@blacey.com"
LABEL com.blacey.name="ezlo-mqttrelay"

WORKDIR /home/node/
COPY [ "package.json", "index.js", "./" ]
RUN npm install  

CMD ["node", "index.js"]
