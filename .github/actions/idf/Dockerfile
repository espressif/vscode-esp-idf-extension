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

ENV NVM_DIR /usr/local/nvm
RUN mkdir -p $NVM_DIR
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.1/install.sh | bash
ENV NODE_VERSION v16.16.0
RUN . "${NVM_DIR}/nvm.sh" && nvm install ${NODE_VERSION} && nvm use --delete-prefix ${NODE_VERSION}

ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH
RUN node --version
RUN npm --version
RUN npm install --global typescript yarn

ADD entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ADD ui-entrypoint.sh /ui-entrypoint.sh
RUN chmod +x /ui-entrypoint.sh


ENTRYPOINT ["/bin/bash"]
CMD ["/entrypoint.sh"]