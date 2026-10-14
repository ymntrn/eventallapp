#!/usr/bin/env bash
# Runs the database tests (supabase/tests/stage1.test.sql) on a throwaway
# local Postgres 15+ with PostGIS. Never touches Supabase.
#
#   npm run test:db
#
# Uses TEST_DATABASE_URL (a superuser connection to a LOCAL server, e.g.
# postgres://postgres@localhost:5432/postgres) when set: creates a fresh
# database there, runs supabase_stub.sql + every migration + the tests, and
# drops it again. Without TEST_DATABASE_URL it starts a temporary cluster with
# initdb/pg_ctl (must not run as root) and removes it afterwards.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
db="eventall_test_$$"
tmp=""

cleanup() {
  if [[ -n "${admin_url:-}" ]]; then psql "$admin_url" -qX -c "drop database if exists $db" >/dev/null 2>&1 || true; fi
  if [[ -n "$tmp" ]]; then pg_ctl -D "$tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$tmp"; fi
}
trap cleanup EXIT

if [[ -n "${TEST_DATABASE_URL:-}" ]]; then
  case "$TEST_DATABASE_URL" in
    *supabase.co*|*supabase.com*|*pooler*) echo "Refusing to run tests against a Supabase host." >&2; exit 1 ;;
  esac
  admin_url="$TEST_DATABASE_URL"
else
  pgbin="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
  [[ -n "$pgbin" ]] && export PATH="$pgbin:$PATH"
  command -v initdb >/dev/null || { echo "initdb not found. Install Postgres + PostGIS or set TEST_DATABASE_URL." >&2; exit 1; }
  [[ "$(id -u)" != "0" ]] || { echo "initdb cannot run as root; set TEST_DATABASE_URL instead." >&2; exit 1; }
  tmp="$(mktemp -d)"
  initdb -D "$tmp/data" -U postgres -A trust >/dev/null
  pg_ctl -D "$tmp/data" -o "-k $tmp -c listen_addresses=''" -l "$tmp/log" -w start >/dev/null
  admin_url="postgresql://postgres@/postgres?host=$tmp"
fi

psql "$admin_url" -qX -v ON_ERROR_STOP=1 -c "create database $db" >/dev/null

# One session: connect to the new database, then stub, migrations, tests.
{
  echo "\\connect $db"
  echo "\\i $root/supabase/tests/supabase_stub.sql"
  for f in "$root"/supabase/migrations/*.sql; do echo "\\i $f"; done
  echo "\\i $root/supabase/tests/stage1.test.sql"
} | psql "$admin_url" -qX -v ON_ERROR_STOP=1
