import { Hono } from 'hono'

function loadV1(app: Hono) {
  app.get('/v1', (c) => {
  return c.text('Analytics Service 0debt')
})

app.get('/v1/health', (ctx) => {
    return ctx.json({
      message: 'ANALYTICS SERVICE',
      version: '1',
      status: 'healthy',
      timestamp:new Date().toISOString()
    })
  })



}




export default loadV1