#!/bin/bash
# Pompoenlab starten op macOS: dubbelklik dit bestand in de Finder.
# Start een lokale webserver in deze map en opent het spel in de browser.
# Stoppen: sluit dit Terminal-venster (of druk Ctrl+C).

cd "$(dirname "$0")" || exit 1

PORT=8000
while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo "Pompoenlab draait op http://localhost:$PORT"
echo "Sluit dit venster (of druk Ctrl+C) om te stoppen."
(sleep 1 && open "http://localhost:$PORT") &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
