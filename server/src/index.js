import { createApp } from './app.js';

const port = Number(process.env.PORT) || 4000;

createApp().listen(port, () => {
  console.log(`API NetConnect démarrée sur http://localhost:${port} (paiements en mode SIMULATION)`);
});
