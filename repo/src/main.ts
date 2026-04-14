import App from './App.svelte';
import { getDb } from './services/db';
import { ensureFirstRunSeed } from './services/auth.service';
import { purgeOldEntries } from './services/audit.service';
import { seedDefaultDepot } from './services/delivery.service';

void (async () => {
  try {
    await getDb();
    await ensureFirstRunSeed();
    await seedDefaultDepot();
    await purgeOldEntries();
  } catch (err) {
    console.error('Startup initialization failed', err);
  }
})();

const target = document.getElementById('app');
if (!target) throw new Error('#app root missing');

const app = new App({ target });
export default app;
