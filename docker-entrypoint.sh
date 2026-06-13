#!/bin/sh
# Crew image entrypoint. Two database modes, selected by whether a database
# URL is provided (either MASH_DATABASE_URL or CREW_DATABASE_URL):
#
#   set   -> external-database mode (docker compose, real deployments):
#            skip embedded Postgres entirely and run the server.
#   unset -> single-container mode: init/start the embedded Postgres on the
#            data volume, point the server at it, then run.
#
# The server is chosen by CREW_SERVE_MODE (host | beta) in the image CMD.
# Both the host runtime and the beta BFF need a database; the beta BFF reads
# CREW_DATABASE_URL while the runtime reads MASH_DATABASE_URL, so the two are
# kept in sync below.
#
# The crew server also requires DBOS_CONDUCTOR_KEY and ANTHROPIC_API_KEY in
# the environment; build_pool() fails with a clear error if they are missing.
set -e

if [ -z "${MASH_DATABASE_URL:-}" ] && [ -z "${CREW_DATABASE_URL:-}" ]; then
    PG_BIN=$(ls -d /usr/lib/postgresql/*/bin | head -n 1)
    PGDATA="${CREW_DATA_DIR:-/var/lib/crew}/pg"
    SOCKET_DIR=/var/run/postgresql

    mkdir -p "$PGDATA" "$SOCKET_DIR"
    chown -R postgres:postgres "$PGDATA" "$SOCKET_DIR"
    chmod 700 "$PGDATA"

    as_postgres() {
        su -s /bin/sh postgres -c "$1"
    }

    if [ ! -s "$PGDATA/PG_VERSION" ]; then
        echo "crew: initializing embedded Postgres at $PGDATA"
        as_postgres "$PG_BIN/initdb --no-locale -E UTF8 -D '$PGDATA'" > /dev/null
    fi

    echo "crew: starting embedded Postgres"
    as_postgres "$PG_BIN/pg_ctl -D '$PGDATA' -w -t 60 -l '$PGDATA/postgres.log' \
        -o \"-c listen_addresses='127.0.0.1' -c unix_socket_directories='$SOCKET_DIR'\" start"

    # Idempotent provisioning: CREATE fails when the object exists, which is fine.
    # Anything genuinely broken surfaces as a clear DB error when the host starts.
    as_postgres "$PG_BIN/psql -h $SOCKET_DIR -c \"CREATE ROLE mash LOGIN PASSWORD 'mash'\"" 2> /dev/null || true
    as_postgres "$PG_BIN/psql -h $SOCKET_DIR -c 'CREATE DATABASE mash_crew OWNER mash'" 2> /dev/null || true

    export MASH_DATABASE_URL="postgresql://mash:mash@127.0.0.1:5432/mash_crew"
fi

# Keep the runtime and beta-BFF database variables in sync: whichever was
# provided (or set above for embedded mode) populates the other.
if [ -z "${MASH_DATABASE_URL:-}" ]; then
    export MASH_DATABASE_URL="${CREW_DATABASE_URL}"
fi
if [ -z "${CREW_DATABASE_URL:-}" ]; then
    export CREW_DATABASE_URL="${MASH_DATABASE_URL}"
fi

exec "$@"
