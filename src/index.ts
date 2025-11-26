import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import budgetsRouter from './routes/budgets'; 

const app = new Hono();

// --- MIDDLEWARE LOCAL - solo para este servicio ---
app.use('*', logger());
app.use('*', cors()); 

// --- RUTAS DE SALUD ejemplo ---
app.get('/', (c) => c.text('Analytics Service Root OK'));
app.get('/health', (c) => c.text('Analytics Service Healthy on port 3005'));


// --- RUTAS DE DEBUG ---
app.get('/debug', (c) => c.text('ANALYTICS ALIVE AND ACCEPTING TRAFFIC!'));

// --- RUTAS DE NEGOCIO ---
app.get('/analytics', (c) => c.text('Analytics API Base OK'));
//app.route('/analytics/budgets', budgetsRouter);
app.route('/budgets', budgetsRouter);

// --- INICIO SERVIDOR ---
const port = Number(Bun.env.PORT || 3005);
const appHostname = Bun.env.NODE_ENV === 'development' ? 'localhost' : '0.0.0.0';

Bun.serve({
    fetch: app.fetch,
    port,
    hostname: appHostname,
});

console.log(`Analytics Service running on http://${appHostname}:${port}`);