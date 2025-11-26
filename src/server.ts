import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import loadBudgetsV1 from '@/routes/budgets';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { openApiSpec } from '@/config/openapi';

const app = new Hono();

app.use('*', logger());
app.use('*', cors()); 

// OpenAPI JSON endpoint
app.get('/docs', (c) => {
  return c.json(openApiSpec);
});

// Swagger UI
app.get('/swagger', swaggerUI({ url: '/docs' }));

loadBudgetsV1(app);

const internalAppPort = parseInt(Bun.env.PORT || '3001')
const appHostname = Bun.env.NODE_ENV === 'development' ? 'localhost' : '0.0.0.0'

async function startServer() {
  console.log('Starting ANALYTICS SERVICE SERVER...')
  console.log(`NODE_ENV: ${Bun.env.NODE_ENV}`)

  // Connect to MongoDB
  await connectDatabase();

  const server = Bun.serve({
    port: internalAppPort,
    hostname: appHostname,
    fetch: app.fetch,
  })
  
  console.log(`ANALYTICS SERVICE is running on http://${server.hostname}:${server.port}`)
  console.log(`Swagger UI: http://${server.hostname}:${server.port}/swagger`)
  console.log(`OpenAPI JSON: http://${server.hostname}:${server.port}/docs`)

  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, gracefully shutting down...')
    await disconnectDatabase();
    server.stop()
    console.log('Server stopped gracefully')
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, gracefully shutting down...')
    await disconnectDatabase();
    server.stop()
    console.log('Server stopped gracefully')
    process.exit(0)
  })
}

startServer();