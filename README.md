# Analytics service

> **Documento de evaluacion:** Ver [criterio-valoracion-microservicio.md](./criterio-valoracion-microservicio.md) para el detalle de todos los requisitos implementados, su ubicacion en el codigo y la nota a la que se opta.

A microservice for managing budgets and analytics, built with **Bun** and **Hono**. Part of the **0debt** project.

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Bun-black?style=flat-square&logo=bun" alt="Bun">
  <img src="https://img.shields.io/badge/Framework-Hono-E36002?style=flat-square&logo=hono" alt="Hono">
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=flat-square&logo=mongodb" alt="MongoDB">
  <img src="https://img.shields.io/badge/Cache-Redis-DC382D?style=flat-square&logo=redis" alt="Redis">
</p>

## Features

- 🚀 **Fast**: Built on Bun runtime for optimal performance
- 📊 **Budget Management**: Create, update, delete, and monitor budgets
- 🔐 **JWT Auth**: User identification via Kong Gateway (Trust the Gateway)
- ⚡ **Redis Cache**: Cache-Aside pattern with 5s TTL
- 🔌 **Circuit Breaker**: Resilient integration with expenses-service (opossum)
- 📈 **Charts**: QuickChart.io integration with Feature Toggle
- 🔄 **SAGA Support**: Internal endpoint for distributed transactions
- 🛡️ **Rate Limit**: Middleware propio por plan en el endpoint de QuickChart (FREE/PRO/ENTERPRISE)
- 📚 **API Documentation**: Swagger UI for interactive API testing
- 🧪 **Testing**: 20+ tests covering all scenarios

## Tech stack

| Component | Technology |
|-----------|------------|
| Runtime | [Bun](https://bun.sh/) |
| Framework | [Hono](https://hono.dev/) |
| Database | MongoDB Atlas (Mongoose) |
| Cache | Redis (ioredis) |
| Resilience | Circuit Breaker (opossum) |
| Auth | JWT decode (jwt-decode) |

## Prerequisites

- [Bun](https://bun.sh/) (latest version)
- MongoDB Atlas account or local MongoDB instance
- Redis (optional - service works without it)

## Installation

```bash
git clone <repository-url>
cd analytics-service
bun install
```

## Configuration

Create a `.env` file:

```env
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
NODE_ENV=development

# Optional (graceful defaults)
REDIS_URL=redis://localhost:6379          # Without Redis = cache disabled
EXPENSES_SERVICE_URL=http://localhost:3000 # Without URL = mock data
ENABLE_CHARTS=true                         # Without = feature disabled
```

### Database selection

Based on `NODE_ENV`:
- `development` → `dev` database
- `test` → `test` database  
- `production` → `prod` database

## Usage

### Development

```bash
bun run dev
```

Server starts on `http://localhost:3000`

### Production

```bash
NODE_ENV=production bun run src/server.ts
```

## API endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/v1/health` | Health check | No |
| POST | `/v1/budgets` | Create budget | **Yes** |
| GET | `/v1/budgets/group/:groupId` | List group budgets | No |
| PUT | `/v1/budgets/:id` | Update limit | No |
| DELETE | `/v1/budgets/:id` | Delete budget | No |
| GET | `/v1/budgets/:id/status` | Get status (cached) | No |
| GET | `/v1/budgets/:id/chart` | Get chart URL | No |
| DELETE | `/v1/internal/users/:userId` | SAGA: Delete user data | Internal |

### Create budget (requires JWT)

```bash
curl -X POST http://localhost:3000/v1/budgets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"groupId":"group-123","category":"Food","limitAmount":500,"period":"monthly"}'
```

### Get budget status

```bash
curl http://localhost:3000/v1/budgets/:id/status
```

Response:
```json
{
  "limit": 500,
  "spent": 150.00,
  "health": "OK"
}
```

Health values: `OK` (<80%), `WARNING` (80-100%), `OVERBUDGET` (>100%)

### Get chart URL (feature toggle, default ON)

```bash
curl http://localhost:3000/v1/budgets/:id/chart
```

Response (default or `ENABLE_CHARTS` not set, unless explicitly `false`):
```json
{
  "url": "https://quickchart.io/chart?c=..."
}
```
Rate limit por plan (middleware propio, ventana mensual ~30 días):
- FREE: 2 req/mes
- PRO: 15 req/mes
- ENTERPRISE: 50 req/mes
Sin token se aplica FREE y se usa IP/userId como clave. Para deshabilitar la feature, define `ENABLE_CHARTS=false`.

### SAGA: Delete user budgets

```bash
curl -X DELETE http://localhost:3000/v1/internal/users/:userId
```

Response:
```json
{
  "status": "ok",
  "deletedCount": 3
}
```

## Architecture

See [plan-phases.md](./plan-phases.md) for detailed diagrams and implementation phases.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│    Kong     │────▶│  Analytics  │
│             │     │   Gateway   │     │   Service   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
             ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
             │   MongoDB   │           │    Redis    │           │  Expenses   │
             │   (Data)    │           │   (Cache)   │           │  Service    │
             └─────────────┘           └─────────────┘           └─────────────┘
```

## API documentation

- **Swagger UI**: `http://localhost:3000/swagger`
- **OpenAPI JSON**: `http://localhost:3000/docs`

## Testing

```bash
# Start server in one terminal
bun run dev

# Run tests in another terminal
API_URL=http://localhost:3000 bun test
```

### Test coverage (20 tests)

- ✅ Health check
- ✅ Budget CRUD operations
- ✅ Authorization validation
- ✅ Cache behavior (hit/miss)
- ✅ Feature toggle (charts)
- ✅ SAGA participation
- ✅ Input validation

## Project structure

```
analytics-service/
├── .github/
│   └── workflows/
│       ├── deploy.yaml       # CI/CD: Build + Deploy to Coolify
│       └── test.yaml         # CI: Run tests on tag
├── src/
│   ├── clients/
│   │   └── expensesClient.ts # Circuit Breaker client
│   ├── config/
│   │   ├── database.ts       # MongoDB connection
│   │   ├── openapi.ts        # OpenAPI specification
│   │   └── redis.ts          # Redis connection + retry
│   ├── controllers/
│   │   └── budgetController.ts  # All budget handlers
│   ├── helpers/
│   │   └── userContext.ts    # JWT decode helper
│   ├── middleware/
│   │   └── chartRateLimiter.ts  # Rate limit by plan
│   ├── models/
│   │   └── budgetSchema.ts   # Mongoose schema
│   ├── routes/
│   │   └── budgets.ts        # Route definitions
│   ├── services/
│   │   └── chartService.ts   # QuickChart URL generator
│   └── server.ts             # Entry point
├── tests/
│   └── integration/
│       └── budget.test.ts    # 20 integration tests
├── Dockerfile                # Docker image
├── package.json
├── criterio-valoracion-microservicio.md  # Evaluation criteria
└── README.md
```

## Resilience patterns

### Circuit Breaker (expenses-service)

- **Timeout**: 3 seconds
- **Error Threshold**: 50%
- **Reset Timeout**: 10 seconds
- **Fallback**: Returns `null`, service continues

### Cache-Aside (Redis)

- **TTL**: 5 seconds
- **Key**: `analytics:budget:stats:{groupId}`
- **Graceful**: Works without Redis (cache disabled)

## License

MIT
