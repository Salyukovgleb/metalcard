FROM postgres:15

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-boto3 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /scripts

COPY docker/db-backup/backup.sh /scripts/backup.sh
RUN chmod +x /scripts/backup.sh

CMD ["sh", "/scripts/backup.sh"]
