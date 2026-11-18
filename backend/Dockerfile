# syntax=docker/dockerfile:1

# ---- build stage: install the app and its dependencies into a virtualenv ----
FROM python:3.12-slim AS build

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /build
COPY pyproject.toml ./
COPY src ./src
RUN pip install .

# ---- runtime stage: slim image, non-root user, only the virtualenv ----
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    LOG_LEVEL=INFO

RUN groupadd --system app && useradd --system --gid app --no-create-home app

COPY --from=build /opt/venv /opt/venv

USER app
EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=2)" || exit 1

# Access logging is done by the app's JSON middleware, so uvicorn's own access log is disabled.
CMD ["uvicorn", "mynote.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--proxy-headers"]
