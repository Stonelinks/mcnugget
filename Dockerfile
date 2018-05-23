FROM nvidia/cuda:9.2-runtime-ubuntu16.04

RUN apt-get update && apt-get install -y \
  graphviz \
  mercurial \
  git \
  cmake \
  build-essential \
  libboost-all-dev \
  libsuitesparse-dev \
  libfreeimage-dev \
  libgoogle-glog-dev \
  libgflags-dev \
  libglew-dev \
  freeglut3-dev \
  qt5-default \
  libxmu-dev \
  libxi-dev \
  libatlas-base-dev \
  libsuitesparse-dev \
  libxxf86vm1 \
  libxxf86vm-dev \
  libxi-dev \
  libxrandr-dev \
  libpng-dev \
  libjpeg-dev \
  libtiff-dev \
  libglu1-mesa-dev \
  libopencv-dev \
  libcgal-dev \
  libcgal-qt5-dev \
  libglfw3-dev \
  tmux \
  curl \
  python3 \
  python3-pip
  # && rm -rf /var/lib/apt/lists/*

RUN mkdir /src/

# Install Eigen 3.2
WORKDIR /src
RUN hg clone https://bitbucket.org/eigen/eigen#3.2 eigen && mkdir /src/eigen/build
WORKDIR /src/eigen/build
RUN cmake .. && make -j4 && make install && make clean

# Install Ceres Solver
WORKDIR /src
RUN git clone https://ceres-solver.googlesource.com/ceres-solver && mkdir /src/ceres-solver/build
WORKDIR /src/ceres-solver/build
RUN cmake -DBUILD_TESTING=OFF -DBUILD_EXAMPLES=OFF .. && make -j4 && make install && make clean 

# Install Colmap
WORKDIR /src
RUN git clone https://github.com/colmap/colmap && mkdir /src/colmap/build
WORKDIR /src/colmap/build
RUN cmake -DCMAKE_BUILD_TYPE=Release -DTESTS_ENABLED=OFF .. && make -j4 && make install && make clean

# Install openMVS
WORKDIR /src
RUN git clone https://github.com/cdcseacave/VCG.git && git clone https://github.com/cdcseacave/openMVS.git
WORKDIR /src/openMVS/build
RUN cmake -DCMAKE_BUILD_TYPE=Release -DVCG_DIR="../../VCG" .. && make -j4 && make install && make clean

# Delete source files
RUN rm -r /src

# Setup node
RUN apt-get install -y 
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash
RUN apt-get install -y nodejs

# Setup mcnugget python and npm deps
WORKDIR /root
ADD requirements.txt requirements.txt
RUN python3 -m pip install -r requirements.txt
ADD mcnugget/mcnugget-app/package.json package.json
RUN npm i -g

EXPOSE 5000
EXPOSE 3006

# Remove unnecessary packages
RUN apt-get purge -y cmake mercurial git build-essential && apt-get autoremove -y

CMD /bin/bash
