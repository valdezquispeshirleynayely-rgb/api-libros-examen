# API REST de catálogo de libros — Examen, Ejercicio 1 (Tema 4)

API en **Node.js + Express** que corre en **Amazon EC2**, publicada con **Nginx** (puerto 80) y que guarda los datos en **Amazon RDS (MySQL/MariaDB)** sin acceso público.

**Autor:** nayely · Recursos AWS identificados con el prefijo `snvq-`.

## Recursos de AWS utilizados
| Recurso | Nombre | Detalle |
|---|---|---|
| VPC | VPC por defecto (o propia) | EC2 y RDS en la misma VPC |
| EC2 | `snvq-api-libros` | Amazon Linux 2023, t2/t3.micro |
| RDS | `snvq-db-libros` | MySQL/MariaDB, **Public access = No** |
| SG EC2 | `snvq-sg-ec2` | 22 solo desde mi IP/32; 80 desde 0.0.0.0/0 |
| SG RDS | `snvq-sg-rds` | 3306 solo desde `snvq-sg-ec2` |

No se abren los puertos 3000 ni 3306 a Internet (la API escucha en 127.0.0.1:3000).

## Estructura
- `server.js` — API Express
- `db.sql` — creación de la base y la tabla `libros`
- `.env.example` — variables de entorno (valores ficticios)
- `deploy/` — configuración de Nginx y servicio systemd
- `tests/smoke.sh` — pruebas con curl
- `evidencias/` — capturas

## Despliegue (resumen)
1. Crear SG, RDS y EC2 según la tabla anterior.
2. Conectar por SSH a EC2 e instalar dependencias:
   ```bash
   sudo dnf install -y nodejs npm nginx git mariadb105
   git clone https://github.com/<usuario>/<repo>.git api-libros && cd api-libros
   npm install
   ```
3. Crear la tabla en RDS (desde EC2):
   ```bash
   mysql -h <ENDPOINT_RDS> -u admin -p < db.sql
   ```
4. Configurar variables: `cp .env.example .env` y editar con el endpoint y credenciales reales.
5. Servicio systemd:
   ```bash
   sudo cp deploy/api-libros.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now api-libros
   ```
6. Nginx:
   ```bash
   sudo cp deploy/nginx-api-libros.conf /etc/nginx/conf.d/api-libros.conf
   sudo nginx -t && sudo systemctl enable --now nginx && sudo systemctl reload nginx
   ```

## Ejecutar la aplicación
```bash
npm install
npm start          # escucha en 127.0.0.1:3000
```

## Ejecutar las pruebas
```bash
BASE_URL=http://<IP_PUBLICA_EC2> npm test
```

## Verificar el despliegue
```bash
curl http://<IP_PUBLICA_EC2>/health
curl -X POST http://<IP_PUBLICA_EC2>/libros -H "Content-Type: application/json" \
  -d '{"titulo":"Cien años de soledad","autor":"Gabriel García Márquez","anio_publicacion":1967}'
curl http://<IP_PUBLICA_EC2>/libros
curl -X PUT http://<IP_PUBLICA_EC2>/libros/1 -H "Content-Type: application/json" \
  -d '{"titulo":"Cien años de soledad","autor":"G. García Márquez","anio_publicacion":1967}'
curl -X DELETE http://<IP_PUBLICA_EC2>/libros/1
```
Comprobar en RDS (desde EC2): `mysql -h <ENDPOINT_RDS> -u admin -p -e "SELECT * FROM catalogo.libros;"`

## Endpoints
| Método | Ruta | Respuestas |
|---|---|---|
| GET | /health | 200 |
| GET | /libros | 200 |
| GET | /libros/:id | 200 / 404 |
| POST | /libros | 201 / 400 |
| PUT | /libros/:id | 200 / 400 / 404 |
| DELETE | /libros/:id | 200 / 404 |

## Evidencias (carpeta `evidencias/`)
Capturas de: EC2 y RDS (nombres, VPC, Public access = No), reglas de ambos SG, ejecución de `db.sql`, curl de crear/consultar/actualizar/eliminar desde mi equipo, y `SELECT` en RDS. Datos sensibles ocultos.

