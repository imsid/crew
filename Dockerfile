FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV MASH_DATA_DIR=/var/lib/mash

WORKDIR /opt/crew

COPY pyproject.toml README.md ./
COPY src ./src

RUN pip install .

RUN mkdir -p /var/lib/mash

EXPOSE 8000

# The crew process: the FastAPI BFF hosting the agents in-process, serving
# the web/CLI API, and mounting the Mash host API at /host. Requires
# CREW_DATABASE_URL (and ANTHROPIC_API_KEY) in the environment.
CMD ["python", "-m", "uvicorn", "crew.beta:build_beta_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
