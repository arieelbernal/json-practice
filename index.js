import 'dotenv/config';
import express from 'express';

import usuariosRouter from './routes/usuarios.routes.js';
import productosRouter from './routes/productos.routes.js';
import ventasRouter from './routes/ventas.routes.js';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'json-practice',
    routes: {
      usuarios: '/usuarios',
      productos: '/productos',
      ventas: '/ventas',
    },
  });
});

app.use('/usuarios', usuariosRouter);
app.use('/productos', productosRouter);
app.use('/ventas', ventasRouter);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
