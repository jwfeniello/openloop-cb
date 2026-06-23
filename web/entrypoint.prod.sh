#!/bin/sh

if [ "$DATABASE" = "postgres" ]
then
    echo "Waiting for postgres..."

    python -c "
import socket
import sys
import time
import os

host = os.environ.get('SQL_HOST')
port = int(os.environ.get('SQL_PORT', 5432))
while True:
    try:
        with socket.create_connection((host, port), timeout=1):
            sys.exit(0)
    except OSError:
        time.sleep(0.1)
"

    echo "PostgreSQL started"
fi

python manage.py makemigrations library
python manage.py migrate
python manage.py collectstatic --no-input

exec "$@"