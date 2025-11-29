# Analytics Service

A microservice for managing budgets and analytics, built with **Bun** and **Hono**. This service provides endpoints for creating, managing, and monitoring budgets with integration to MongoDB Atlas.

<p align="center">

  <img src="https://img.shields.io/badge/Runtime-Bun-black?style=flat-square&logo=bun" alt="Bun">

  <img src="https://img.shields.io/badge/Framework-Hono-E36002?style=flat-square&logo=hono" alt="Hono">

</p>

## Features

- 🚀 **Fast**: Built on Bun runtime for optimal performance
- 📊 **Budget Management**: Create, update, and monitor budgets
- 🔍 **Health Monitoring**: Real-time budget status tracking
- 📚 **API Documentation**: Swagger UI for interactive API testing
- 🧪 **Testing**: Comprehensive test suite with Bun test
- 🔒 **CORS**: Configurable CORS for production and development

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Hono](https://hono.dev/)
- **Database**: MongoDB (via Mongoose)
- **Documentation**: Swagger UI / OpenAPI

## Prerequisites

- [Bun](https://bun.sh/) (latest version)
- MongoDB Atlas account or local MongoDB instance

## Installation

1. Clone the repository:
```sh
git clone <repository-url>
cd analytics-service
```

2. Install dependencies:
```sh
bun install
```

3. Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=cluster-name
NODE_ENV=development
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `NODE_ENV` | Environment (development, test, production) | `development` | No |

### Database Configuration

The service automatically selects the database based on `NODE_ENV`:
- `development` → `dev` database
- `test` → `test` database
- `production` → `prod` database

## Usage

### Development

Start the development server with hot reload:
```sh
bun run dev
```

The server will start on `http://localhost:3000`

### Production

```sh
NODE_ENV=production bun run src/server.ts
```

## API Endpoints

### Health Check

```http
GET /v1/health
```

Returns the service health status.

### Budget Management

#### Create Budget
```http
POST /v1/budgets
Content-Type: application/json

{
  "groupId": "group-123",
  "category": "Food",
  "limitAmount": 500,
  "period": "monthly"
}
```

#### List Group Budgets
```http
GET /v1/budgets/group/:groupId
```

#### Update Budget Limit
```http
PUT /v1/budgets/:id
Content-Type: application/json

{
  "limitAmount": 750
}
```

#### Get Budget Status
```http
GET /v1/budgets/:id/status
```

Returns:
```json
{
  "limit": 500,
  "spent": 150.00,
  "health": "OK"
}
```

Health status values:
- `OK`: Spent < 80% of limit
- `WARNING`: Spent >= 80% of limit
- `OVERBUDGET`: Spent > limit

## API Documentation

### Swagger UI

Once the server is running, access the interactive API documentation at:

```
http://localhost:3001/swagger
```

### OpenAPI JSON

The OpenAPI specification is available at:

```
http://localhost:3001/docs
```

## Testing

Run the test suite:
```sh
bun test
```

The test script automatically sets `NODE_ENV=test` to use the test database.

### Test Coverage

Tests include:
- ✅ Server health check
- ✅ Budget creation
- ✅ Group budget listing
- ✅ Budget limit updates
- ✅ Budget status retrieval
- ✅ Input validation

## Project Structure

```
analytics-service/
├── src/
│   ├── config/
│   │   ├── database.ts      # MongoDB connection
│   │   └── openapi.ts        # OpenAPI specification
│   ├── controllers/
│   │   └── budgetController.ts
│   ├── models/
│   │   ├── budgetSchema.ts   # Budget Mongoose schema
│   │   └── budget.test.ts     # Test suite
│   ├── routes/
│   │   └── budgets.ts         # API routes
│   ├── clients/
│   │   └── expensesClient.ts  # Expenses service client (mock)
│   └── server.ts              # Main server file
├── .github/
│   └── workflows/
│       └── test.yaml          # CI/CD workflow
├── package.json
└── README.md
```

## CI/CD

GitHub Actions workflow runs tests on every push to `main` branch. The workflow:
1. Sets up Bun
2. Installs dependencies
3. Starts the server with test environment
4. Runs the test suite
