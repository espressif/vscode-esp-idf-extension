FROM espressif/idf:release-v4.4

ARG DEBIAN_FRONTEND=nointeractive

RUN apt-get update && apt-get install -y \
 curl \
 libasound2 \
 libgbm-dev \
 libgtk-3-0 \
 libnotify4 \
 libnss3 \
 libsecret-1-0 \
 libxss1 \
 libxtst6 \
 gnome-keyring \
 xvfb

ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
ENV DISPLAY=":99"
ENV CODE_TESTS_PATH="out/test"
ENV CODE_VERSION="min"

ENV NODE_VERSION=14.2.0
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version
RUN npm install --global typescript yarn

ADD entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ADD ui-entrypoint.sh /ui-entrypoint.sh
RUN chmod +x /ui-entrypoint.sh


ENTRYPOINT ["/bin/bash"]
CMD ["/entrypoint.sh"]