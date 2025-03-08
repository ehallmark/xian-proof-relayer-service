#/bin/sh -e

docker build -t proof-relayer -f Dockerfile .

docker-compose up