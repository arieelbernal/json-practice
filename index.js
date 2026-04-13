import { readFile } from 'node:fs/promises';

async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

function indexById(items) {
  const map = new Map();
  for (const item of items) map.set(item.id, item);
  return map;
}

async function main() {
  const [usuarios, productos, ventas] = await Promise.all([
    readJson('./usuarios.json'),
    readJson('./productos.json'),
    readJson('./ventas.json'),
  ]);

  const usuariosById = indexById(usuarios);
  const productosById = indexById(productos);

  const errores = [];

  for (const venta of ventas) {
    if (!usuariosById.has(venta.id_usuario)) {
      errores.push({ id_venta: venta.id, error: 'id_usuario inexistente' });
    }

    if (!Array.isArray(venta.productos)) {
      errores.push({ id_venta: venta.id, error: 'productos no es un array' });
      continue;
    }

    for (const item of venta.productos) {
      const productId = item?.id;
      if (typeof productId !== 'number') {
        errores.push({ id_venta: venta.id, error: 'producto sin id numérico' });
        continue;
      }

      if (!productosById.has(productId)) {
        errores.push({ id_venta: venta.id, error: `producto inexistente: ${productId}` });
      }
    }
  }

  console.log({
    usuarios: usuarios.length,
    productos: productos.length,
    ventas: ventas.length,
    errores,
  });
}

main().catch((err) => {
  console.error('Error ejecutando index.js:', err);
  process.exitCode = 1;
});
