docker compose exec app node migrate.js

ADMIN_USER=whatever ADMIN_PASS=whatever docker compose up --build -d
docker compose exec app node migrate.js # if not in CMD
