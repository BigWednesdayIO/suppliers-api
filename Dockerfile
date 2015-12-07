FROM node:5.1.1

ADD . /src

RUN cd /src; npm install

EXPOSE 8080

WORKDIR /src

CMD ["npm", "start"]
