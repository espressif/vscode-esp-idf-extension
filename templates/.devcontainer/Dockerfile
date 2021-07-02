FROM espressif/idf:latest

RUN apt-get update \
  && apt install -y -q \
  git \
  libglib2.0-0 \
  libnuma1 \
  libpixman-1-0

RUN . $IDF_PATH/export.sh && pip install --no-cache-dir idf-component-manager

# QEMU
ENV QEMU_REL=esp-develop-20210220
ENV QEMU_SHA256=44c130226bdce9aff6abf0aeaab44f09fe4f2d71a5f9225ac1708d68e4852c02
ENV QEMU_DIST=qemu-${QEMU_REL}.tar.bz2
ENV QEMU_URL=https://github.com/espressif/qemu/releases/download/${QEMU_REL}/${QEMU_DIST}

RUN wget --no-verbose ${QEMU_URL} \
  && echo "${QEMU_SHA256} *${QEMU_DIST}" | sha256sum --check --strict - \
  && tar -xf $QEMU_DIST -C /opt \
  && rm ${QEMU_DIST}

ENV PATH=/opt/qemu/bin:${PATH}

RUN echo $($IDF_PATH/tools/idf_tools.py export) >> /etc/bash.bashrc

RUN useradd -m vscodeuser
USER vscodeuser

CMD ["/bin/bash"]