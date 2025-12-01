# Analytics Service

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
- ⚡ **Redis Cache**: Cache-Aside pattern with 60s TTL
- 🔌 **Circuit Breaker**: Resilient integration with expenses-service (opossum)
- 📈 **Charts**: QuickChart.io integration with Feature Toggle
- 🔄 **SAGA Support**: Internal endpoint for distributed transactions
- 📚 **API Documentation**: Swagger UI for interactive API testing
- 🧪 **Testing**: 20+ tests covering all scenarios

## Tech Stack

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
EXPENSES_SERVICE_URL=http://localhost:3001 # Without URL = mock data
ENABLE_CHARTS=true                         # Without = feature disabled
```

### Database Selection

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

## API Endpoints

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

### Create Budget (requires JWT)

```bash
curl -X POST http://localhost:3000/v1/budgets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"groupId":"group-123","category":"Food","limitAmount":500,"period":"monthly"}'
```

### Get Budget Status

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

### Get Chart URL (Feature Toggle)

```bash
curl http://localhost:3000/v1/budgets/:id/chart
```

Response (if `ENABLE_CHARTS=true`):
```json
{
  "url": "https://quickchart.io/chart?c=..."
}
```

### SAGA: Delete User Budgets

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

## API Documentation

- **Swagger UI**: `http://localhost:3000/swagger`
- **OpenAPI JSON**: `http://localhost:3000/docs`

## Testing

```bash
# Start server in one terminal
bun run dev

# Run tests in another terminal
API_URL=http://localhost:3000 bun test
```

### Test Coverage (20 tests)

- ✅ Health check
- ✅ Budget CRUD operations
- ✅ Authorization validation
- ✅ Cache behavior (hit/miss)
- ✅ Feature toggle (charts)
- ✅ SAGA participation
- ✅ Input validation

## Project Structure

```
analytics-service/
├── src/
│   ├── config/
│   │   ├── database.ts       # MongoDB connection
│   │   ├── redis.ts          # Redis connection + retry
│   │   └── openapi.ts        # OpenAPI specification
│   ├── controllers/
│   │   └── budgetController.ts  # All budget handlers
│   ├── helpers/
│   │   └── userContext.ts    # JWT decode helper
│   ├── services/
│   │   └── chartService.ts   # QuickChart URL generator
│   ├── clients/
│   │   └── expensesClient.ts # Circuit Breaker client
│   ├── models/
│   │   ├── budgetSchema.ts   # Mongoose schema
│   │   └── budget.test.ts    # Test suite
│   ├── routes/
│   │   └── budgets.ts        # Route definitions
│   └── server.ts             # Entry point
├── plan-phases.md            # Implementation documentation
├── package.json
└── README.md
```

## Resilience Patterns

### Circuit Breaker (expenses-service)

- **Timeout**: 3 seconds
- **Error Threshold**: 50%
- **Reset Timeout**: 10 seconds
- **Fallback**: Returns `null`, service continues

### Cache-Aside (Redis)

- **TTL**: 60 seconds
- **Key**: `analytics:budget:spent:{groupId}`
- **Graceful**: Works without Redis (cache disabled)

## License

MIT
