"""
WSGI config for openloop project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# Increase open file descriptor limits for large directory uploads
try:
    import resource
    soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    resource.setrlimit(resource.RLIMIT_NOFILE, (min(hard, 65536), hard))
except Exception:
    pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'openloop.settings')

application = get_wsgi_application()
