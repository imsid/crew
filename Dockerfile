FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV MASH_DATA_DIR=/var/lib/mash
ENV MASH_API_HOST=0.0.0.0
ENV MASH_API_PORT=8000

# postgresql powers the single-container mode (embedded DB); when
# MASH_DATABASE_URL is provided (e.g. docker compose), it stays unused.
RUN apt-get update && apt-get install -y --no-install-recommends postgresql && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/crew

COPY pyproject.toml README.md ./
COPY src ./src

RUN pip install .

ENV MASH_HOST_APP=crew.app:build_pool
ENV CREW_DATA_DIR=/var/lib/crew
# Which server this container runs: "host" (Mash host API + telemetry UI) or
# "beta" (the crew.beta FastAPI BFF for the web app). Same image either way.
ENV CREW_SERVE_MODE=host

RUN mkdir -p /var/lib/mash /var/lib/crew

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["sh", "-c", "if [ \"${CREW_SERVE_MODE}\" = \"beta\" ]; then exec python -m uvicorn crew.beta:build_beta_app --factory --host \"${MASH_API_HOST}\" --port \"${MASH_API_PORT}\"; else exec mash host serve --host-app \"${MASH_HOST_APP}\" --host \"${MASH_API_HOST}\" --port \"${MASH_API_PORT}\" ${MASH_API_KEY:+--api-key \"$MASH_API_KEY\"}; fi"]
