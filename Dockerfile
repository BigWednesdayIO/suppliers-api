FROM node:5.2.0

ADD . /src

RUN cd /src; npm install

EXPOSE 8080

WORKDIR /src

CMD ["npm", "start"]
