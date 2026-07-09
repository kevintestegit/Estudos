#!/usr/bin/env bash
# Sobe o portal de estudos na porta 3050 (processo independente do terminal)
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3050
if ss -ltn 2>/dev/null | grep -q ":$PORT "; then
  echo "Já rodando. Abra: http://localhost:$PORT"
  exit 0
fi
setsid python3 -m http.server "$PORT" --directory "$DIR" </dev/null >/tmp/portal-estudos.log 2>&1 &
echo $! > /tmp/portal-estudos.pid
sleep 0.4
echo "Portal: http://localhost:$PORT"
echo "Parar: kill \$(cat /tmp/portal-estudos.pid)"
