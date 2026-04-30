import { Router } from 'express';
import { readFile, writeFile } from 'node:fs/promises';

const router = Router();

const ventasUrl = new URL('../data/ventas.json', import.meta.url);
const usuariosUrl = new URL('../data/usuarios.json', import.meta.url);
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

function indexById(items) {
  const map = new Map();
  for (const item of items) map.set(item.id, item);
  return map;
}

router.get('/', async (req, res) => {
  const ventas = await readJson(ventasUrl);

  if (typeof req.query.id_usuario === 'string') {
    const idUsuario = Number(req.query.id_usuario);
    return res.json(ventas.filter((v) => v.id_usuario === idUsuario));
  }

  return res.json(ventas);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const ventas = await readJson(ventasUrl);
  const venta = ventas.find((v) => v.id === id);

  if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
  return res.json(venta);
});

router.post('/', async (req, res) => {
  const { id_usuario, fecha, total, dirección, productos } = req.body ?? {};

  if (
    typeof id_usuario !== 'number' ||
    typeof fecha !== 'string' ||
    typeof total !== 'number' ||
    typeof dirección !== 'string' ||
    !Array.isArray(productos)
  ) {
    return res.status(400).json({
      error: 'Body inválido. Requiere {id_usuario, fecha, total, dirección, productos[]}',
    });
  }

  const [ventas, usuarios, productosData] = await Promise.all([
    readJson(ventasUrl),
    readJson(usuariosUrl),
    readJson(productosUrl),
  ]);

  const usuariosById = indexById(usuarios);
  const productosById = indexById(productosData);

  if (!usuariosById.has(id_usuario)) {
    return res.status(409).json({ error: 'id_usuario inexistente' });
  }

  for (const item of productos) {
    const pid = item?.id;
    if (typeof pid !== 'number') {
      return res.status(400).json({ error: 'productos debe ser array de objetos con {id:number}' });
    }
    if (!productosById.has(pid)) {
      return res.status(409).json({ error: `producto inexistente: ${pid}` });
    }
  }

  const ventaNueva = {
    id: nextId(ventas),
    id_usuario,
    fecha,
    total,
    dirección,
    productos: productos.map((p) => ({ id: p.id })),
  };

  ventas.push(ventaNueva);
  await writeJson(ventasUrl, ventas);

  return res.status(201).json(ventaNueva);
});

router.post('/by-user', async (req, res) => {
  const { email, contraseña } = req.body ?? {};

  if (typeof email !== 'string' || typeof contraseña !== 'string') {
    return res.status(400).json({ error: 'Body inválido. Requiere {email, contraseña}' });
  }

  const [usuarios, ventas] = await Promise.all([
    readJson(usuariosUrl),
    readJson(ventasUrl),
  ]);

  const usuario = usuarios.find((u) => u.email === email && u.contraseña === contraseña);
  if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ventasUsuario = ventas.filter((v) => v.id_usuario === usuario.id);
  return res.json({
    id_usuario: usuario.id,
    email: usuario.email,
    ventas: ventasUsuario,
  });
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const patch = req.body ?? {};

  const ventas = await readJson(ventasUrl);
  const idx = ventas.findIndex((v) => v.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Venta no encontrada' });

  const venta = ventas[idx];

  if (typeof patch.id_usuario === 'number') {
    const usuarios = await readJson(usuariosUrl);
    const usuariosById = indexById(usuarios);
    if (!usuariosById.has(patch.id_usuario)) {
      return res.status(409).json({ error: 'id_usuario inexistente' });
    }
  }

  if (Array.isArray(patch.productos)) {
    const productosData = await readJson(productosUrl);
    const productosById = indexById(productosData);

    for (const item of patch.productos) {
      const pid = item?.id;
      if (typeof pid !== 'number') {
        return res.status(400).json({ error: 'productos debe ser array de objetos con {id:number}' });
      }
      if (!productosById.has(pid)) {
        return res.status(409).json({ error: `producto inexistente: ${pid}` });
      }
    }
  }

  const updated = {
    ...venta,
    ...(typeof patch.id_usuario === 'number' ? { id_usuario: patch.id_usuario } : {}),
    ...(typeof patch.fecha === 'string' ? { fecha: patch.fecha } : {}),
    ...(typeof patch.total === 'number' ? { total: patch.total } : {}),
    ...(typeof patch.dirección === 'string' ? { dirección: patch.dirección } : {}),
    ...(Array.isArray(patch.productos)
      ? { productos: patch.productos.map((p) => ({ id: p.id })) }
      : {}),
  };

  ventas[idx] = updated;
  await writeJson(ventasUrl, ventas);

  return res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const ventas = await readJson(ventasUrl);

  const venta = ventas.find((v) => v.id === id);
  if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

  const ventasActualizadas = ventas.filter((v) => v.id !== id);
  await writeJson(ventasUrl, ventasActualizadas);

  return res.status(204).send();
});

export default router;
