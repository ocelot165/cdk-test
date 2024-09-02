FROM timbru31/node-alpine-git:latest
RUN apk add gettext
COPY setup.sh /setup.sh
COPY exampleenv.txt /exampleenv.txt
RUN chmod +x /setup.sh
RUN ls
ENTRYPOINT [ "/bin/sh", "/setup.sh"]