import { Router } from 'express';
import { readFile, writeFile } from 'node:fs/promises';

const router = Router();

const usuariosUrl = new URL('../data/usuarios.json', import.meta.url);
const ventasUrl = new URL('../data/ventas.json', import.meta.url);

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
  const usuarios = await readJson(usuariosUrl);

  if (typeof req.query.activo === 'string') {
    const activo = req.query.activo === 'true';
    return res.json(usuarios.filter((u) => u.activo === activo));
  }

  return res.json(usuarios);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const usuarios = await readJson(usuariosUrl);
  const usuario = usuarios.find((u) => u.id === id);

  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json(usuario);
});

router.post('/', async (req, res) => {
  const { nombre, apellido, email, contraseña, activo } = req.body ?? {};

  if (
    typeof nombre !== 'string' ||
    typeof apellido !== 'string' ||
    typeof email !== 'string' ||
    typeof contraseña !== 'string' ||
    typeof activo !== 'boolean'
  ) {
    return res.status(400).json({
      error: 'Body inválido. Requiere {nombre, apellido, email, contraseña, activo}'
    });
  }

  const usuarios = await readJson(usuariosUrl);

  if (usuarios.some((u) => u.email === email)) {
    return res.status(409).json({ error: 'Email ya registrado' });
  }

  const usuarioNuevo = {
    id: nextId(usuarios),
    nombre,
    apellido,
    email,
    contraseña,
    activo,
  };

  usuarios.push(usuarioNuevo);
  await writeJson(usuariosUrl, usuarios);

  return res.status(201).json(usuarioNuevo);
});

router.post('/login', async (req, res) => {
  const { email, contraseña } = req.body ?? {};

  if (typeof email !== 'string' || typeof contraseña !== 'string') {
    return res.status(400).json({ error: 'Body inválido. Requiere {email, contraseña}' });
  }

  const usuarios = await readJson(usuariosUrl);
  const usuario = usuarios.find((u) => u.email === email && u.contraseña === contraseña);

  if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

  return res.json({
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    activo: usuario.activo,
  });
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const patch = req.body ?? {};

  const usuarios = await readJson(usuariosUrl);
  const idx = usuarios.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

  const usuario = usuarios[idx];

  const updated = {
    ...usuario,
    ...(typeof patch.nombre === 'string' ? { nombre: patch.nombre } : {}),
    ...(typeof patch.apellido === 'string' ? { apellido: patch.apellido } : {}),
    ...(typeof patch.email === 'string' ? { email: patch.email } : {}),
    ...(typeof patch.contraseña === 'string' ? { contraseña: patch.contraseña } : {}),
    ...(typeof patch.activo === 'boolean' ? { activo: patch.activo } : {}),
  };

  usuarios[idx] = updated;
  await writeJson(usuariosUrl, usuarios);

  return res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);

  const [usuarios, ventas] = await Promise.all([
    readJson(usuariosUrl),
    readJson(ventasUrl),
  ]);

  const usuario = usuarios.find((u) => u.id === id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  const ventasRelacionadas = ventas.filter((v) => v.id_usuario === id);
  if (ventasRelacionadas.length > 0) {
    return res.status(409).json({
      error: 'No se puede eliminar el usuario: tiene ventas asociadas',
      ventas: ventasRelacionadas.map((v) => v.id),
    });
  }

  const usuariosActualizados = usuarios.filter((u) => u.id !== id);
  await writeJson(usuariosUrl, usuariosActualizados);

  return res.status(204).send();
});

export default router;
