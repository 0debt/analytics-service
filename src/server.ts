import { Hono } from 'hono'
import { logger } from 'hono/logger'
import loadV1 from '@/apis/v1'

const app = new Hono()
app.use('*', logger())

loadV1(app)

const internalAppPort = parseInt(Bun.env.PORT || '3001')
const appHostname = Bun.env.NODE_ENV === 'development' ? 'localhost' : '0.0.0.0'

console.log('Starting ANALYTICS SERVICE SERVER...')
console.log(`NODE_ENV: ${Bun.env.NODE_ENV}`)

const server = Bun.serve({
  port: internalAppPort,
  hostname: appHostname,
  fetch: app.fetch,
})

console.log(`ANALYTICS SERVICE is running on http://${server.hostname}:${server.port}`)

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, gracefully shutting down...')
  server.stop()
  console.log('Server stopped gracefully')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, gracefully shutting down...')
  server.stop()
  console.log('Server stopped gracefully')
  process.exit(0)
})