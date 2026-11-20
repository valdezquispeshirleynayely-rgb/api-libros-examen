#!/usr/bin/env bash
# Uso: BASE_URL=http://<IP_PUBLICA_EC2> npm test   (por defecto http://localhost:3000)
BASE_URL="${BASE_URL:-http://localhost:3000}"
fallos=0
check() { # descripción, esperado, obtenido
  if [ "$2" = "$3" ]; then echo "OK   $1 ($3)"; else echo "FAIL $1 (esperado $2, obtenido $3)"; fallos=$((fallos+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
H='Content-Type: application/json'

check "GET /health" 200 "$(code $BASE_URL/health)"
check "POST válido" 201 "$(code -X POST $BASE_URL/libros -H "$H" -d '{"titulo":"Test","autor":"Autor","anio_publicacion":2020}')"
ID=$(curl -s -X POST $BASE_URL/libros -H "$H" -d '{"titulo":"Prueba","autor":"Autor","anio_publicacion":1999}' | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
check "GET /libros" 200 "$(code $BASE_URL/libros)"
check "GET /libros/:id" 200 "$(code $BASE_URL/libros/$ID)"
check "GET inexistente" 404 "$(code $BASE_URL/libros/999999)"
check "POST título vacío" 400 "$(code -X POST $BASE_URL/libros -H "$H" -d '{"titulo":"","autor":"A","anio_publicacion":2000}')"
check "POST año inválido" 400 "$(code -X POST $BASE_URL/libros -H "$H" -d '{"titulo":"T","autor":"A","anio_publicacion":"abc"}')"
check "PUT existente" 200 "$(code -X PUT $BASE_URL/libros/$ID -H "$H" -d '{"titulo":"Editado","autor":"Autor","anio_publicacion":2001}')"
check "PUT inexistente" 404 "$(code -X PUT $BASE_URL/libros/999999 -H "$H" -d '{"titulo":"T","autor":"A","anio_publicacion":2000}')"
check "DELETE existente" 200 "$(code -X DELETE $BASE_URL/libros/$ID)"
check "DELETE inexistente" 404 "$(code -X DELETE $BASE_URL/libros/$ID)"
exit $fallos
