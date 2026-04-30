import { Router } from 'express';
import { readFile, writeFile } from 'node:fs/promises';

const router = Router();

const productosUrl = new URL('../data/productos.json', import.meta.url);

async function readJson(url) {
  const raw = await readFile(url, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(url, data) {
  await writeFile(url, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function nextId(items) {
  const maxId = items.reduce((max, it) => (it.id > max ? it.id : max), 0);
  return maxId + 1;
}

router.get('/', async (req, res) => {
  const productos = await readJson(productosUrl);

  if (typeof req.query.activo === 'string') {
    const activo = req.query.activo === 'true';
    return res.json(productos.filter((p) => p.activo === activo));
  }

  return res.json(productos);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const productos = await readJson(productosUrl);
  const producto = productos.find((p) => p.id === id);

  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.json(producto);
});

router.post('/', async (req, res) => {
  const { nombre, desc, precio, imagen, activo } = req.body ?? {};

  if (
    typeof nombre !== 'string' ||
    typeof desc !== 'string' ||
    typeof precio !== 'number' ||
    typeof imagen !== 'string' ||
    typeof activo !== 'boolean'
  ) {
    return res.status(400).json({
      error: 'Body inválido. Requiere {nombre, desc, precio, imagen, activo}',
    });
  }

  const productos = await readJson(productosUrl);

  const productoNuevo = {
    id: nextId(productos),
    nombre,
    desc,
    precio,
    imagen,
    activo,
  };

  productos.push(productoNuevo);
  await writeJson(productosUrl, productos);

  return res.status(201).json(productoNuevo);
});

router.post('/search', async (req, res) => {
  const { q, maxPrecio, activo } = req.body ?? {};

  const productos = await readJson(productosUrl);

  let result = productos;

  if (typeof q === 'string' && q.trim().length > 0) {
    const needle = q.trim().toLowerCase();
    result = result.filter(
      (p) => p.nombre.toLowerCase().includes(needle) || p.desc.toLowerCase().includes(needle)
    );
  }

  if (typeof maxPrecio === 'number') {
    result = result.filter((p) => p.precio <= maxPrecio);
  }

  if (typeof activo === 'boolean') {
    result = result.filter((p) => p.activo === activo);
  }

  return res.json(result);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const patch = req.body ?? {};

  const productos = await readJson(productosUrl);
  const idx = productos.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Producto no encontrado' });

  const producto = productos[idx];

  const updated = {
    ...producto,
    ...(typeof patch.nombre === 'string' ? { nombre: patch.nombre } : {}),
    ...(typeof patch.desc === 'string' ? { desc: patch.desc } : {}),
    ...(typeof patch.precio === 'number' ? { precio: patch.precio } : {}),
    ...(typeof patch.imagen === 'string' ? { imagen: patch.imagen } : {}),
    ...(typeof patch.activo === 'boolean' ? { activo: patch.activo } : {}),
  };

  productos[idx] = updated;
  await writeJson(productosUrl, productos);

  return res.json(updated);
});

export default router;
