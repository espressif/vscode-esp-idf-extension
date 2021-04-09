FROM espressif/idf

RUN apt-get update && apt-get install -y curl xvfb yarn

ENV NODE_VERSION=12.6.0
RUN apt install -y curl
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version

ADD entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY ../../ .
ENTRYPOINT [ "/entrypoint.sh" ]
CMD ["/bin/bash"]