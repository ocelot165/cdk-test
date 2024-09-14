FROM node:22-alpine3.19
RUN apk add gettext
RUN apk add --no-cache unzip
RUN apk add --no-cache aws-cli
COPY setup.sh /setup.sh
COPY exampleenv.txt /exampleenv.txt
RUN chmod +x /setup.sh
RUN ls
ENTRYPOINT [ "/bin/sh", "/setup.sh"]