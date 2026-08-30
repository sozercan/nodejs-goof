# FROM node:6-stretch
FROM node:18.13.0

RUN mkdir /usr/src/goof /tmp/extracted_files && chown node:node /usr/src/goof /tmp/extracted_files
COPY --chown=node:node . /usr/src/goof
WORKDIR /usr/src/goof

USER node
RUN npm ci --ignore-scripts
EXPOSE 3001
EXPOSE 9229
ENTRYPOINT ["npm", "start"]
