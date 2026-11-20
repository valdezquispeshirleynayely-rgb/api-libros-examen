require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// ---------- utilidades ----------
const esEnteroValido = (v) =>
  (typeof v === 'number' && Number.isInteger(v)) ||
  (typeof v === 'string' && /^-?\d+$/.test(v.trim()));

function validarLibro(body) {
  const errores = [];
  const { titulo, autor, anio_publicacion } = body || {};
  if (typeof titulo !== 'string' || titulo.trim() === '') errores.push('titulo no puede estar vacío');
  if (typeof autor !== 'string' || autor.trim() === '') errores.push('autor no puede estar vacío');
  if (!esEnteroValido(anio_publicacion)) errores.push('anio_publicacion debe ser un entero válido');
  return errores;
}

const idValido = (id) => /^\d+$/.test(id) && Number(id) > 0;

async function buscarLibro(id) {
  const [rows] = await pool.execute('SELECT * FROM libros WHERE id = ?', [id]);
  return rows[0];
}

// ---------- endpoints ----------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', servicio: 'api-libros', activo: true });
});

app.get('/libros', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM libros ORDER BY id');
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/libros/:id', async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'id inválido' });
    const libro = await buscarLibro(req.params.id);
    if (!libro) return res.status(404).json({ error: 'Libro no encontrado' });
    res.json(libro);
  } catch (e) { next(e); }
});

app.post('/libros', async (req, res, next) => {
  try {
    const errores = validarLibro(req.body);
    if (errores.length) return res.status(400).json({ errores });
    const { titulo, autor, anio_publicacion } = req.body;
    const [r] = await pool.execute(
      'INSERT INTO libros (titulo, autor, anio_publicacion) VALUES (?, ?, ?)',
      [titulo.trim(), autor.trim(), Number(anio_publicacion)]
    );
    res.status(201).json(await buscarLibro(r.insertId));
  } catch (e) { next(e); }
});

app.put('/libros/:id', async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'id inválido' });
    const errores = validarLibro(req.body);
    if (errores.length) return res.status(400).json({ errores });
    if (!(await buscarLibro(req.params.id))) return res.status(404).json({ error: 'Libro no encontrado' });
    const { titulo, autor, anio_publicacion } = req.body;
    await pool.execute(
      'UPDATE libros SET titulo = ?, autor = ?, anio_publicacion = ? WHERE id = ?',
      [titulo.trim(), autor.trim(), Number(anio_publicacion), req.params.id]
    );
    res.json(await buscarLibro(req.params.id));
  } catch (e) { next(e); }
});

app.delete('/libros/:id', async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'id inválido' });
    const [r] = await pool.execute('DELETE FROM libros WHERE id = ?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Libro no encontrado' });
    res.json({ mensaje: 'Libro eliminado', id: Number(req.params.id) });
  } catch (e) { next(e); }
});

// ---------- errores ----------
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Escucha solo en localhost: el acceso público es únicamente por Nginx (puerto 80)
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '127.0.0.1', () => console.log(`API escuchando en 127.0.0.1:${PORT}`));
