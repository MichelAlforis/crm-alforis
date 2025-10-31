"""
Wrapper module exposing the Celery application for CLI entrypoints.

Docker commands use ``celery -A celery_app ...``. To avoid maintaining two
separate Celery configurations, this module simply re-exports the unified
application defined in ``tasks.celery_app``.
"""

from tasks.celery_app import celery_app as app

# Backwards compatibility for code importing ``celery_app`` directly.
celery_app = app


if __name__ == "__main__":
    app.start()
