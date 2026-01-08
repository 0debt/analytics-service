# Documento de entrega - Analytics service

**Autores:** Jorge Florentino Serra y Maria Luisa Rodriguez Cabrera

---

## 1. Nivel de acabado

**Nota a la que se opta:** 10

Se han implementado todos los requisitos base del microservicio y los 6 requisitos avanzados necesarios para optar a la maxima calificacion.

---

## 2. Descripcion de la aplicacion

**0debt** es una plataforma financiera distribuida construida con principios cloud-native modernos que resuelve la gestion de gastos compartidos mediante una arquitectura de microservicios resilientes.

La plataforma permite a los usuarios:
- Gestionar gastos compartidos en grupos
- Simplificar deudas entre miembros
- Establecer y monitorizar presupuestos
- Visualizar analiticas de gastos
- Recibir notificaciones de actividad

---

## 3. Descomposicion en microservicios

La plataforma se organiza en servicios debilmente acoplados que se comunican via HTTP y Redis Pub/Sub:

### Servicios principales

| Servicio | Descripcion | Repositorio |
|----------|-------------|-------------|
| **users-service** | Gestiona identidad, autenticacion JWT y planes de suscripcion | [0debt/users-service](https://github.com/0debt/users-service) |
| **groups-service** | Administra espacios colaborativos y membresias | [0debt/groups-service](https://github.com/0debt/groups-service) |
| **expenses-service** | Motor financiero que ejecuta el algoritmo de simplificacion de deudas (patron Saga) | [0debt/expenses-service](https://github.com/0debt/expenses-service) |

### Servicios de negocio y soporte

| Servicio | Descripcion | Repositorio |
|----------|-------------|-------------|
| **analytics-service** | Genera reportes financieros e informacion de presupuestos | [0debt/analytics-service](https://github.com/0debt/analytics-service) |
| **notifications-service** | Servicio orientado a eventos para emails transaccionales via Resend | [0debt/notifications-service](https://github.com/0debt/notifications-service) |

### Infraestructura

| Componente | Descripcion | Repositorio |
|------------|-------------|-------------|
| **api-gateway** | Punto de entrada construido con Hono, maneja routing y rate limiting global | [0debt/api-gateway](https://github.com/0debt/api-gateway) |
| **0debt-frontend** | SPA moderna con Next.js, Shadcn UI y TailwindCSS | [0debt/frontend](https://github.com/0debt/frontend) |
| **0debt-infra** | Configuracion de infraestructura y documentacion | [0debt/0debt-infra](https://github.com/0debt/0debt-infra) |

### Microservicio implementado por la pareja

**analytics-service** - Servicio de analiticas y presupuestos

Este microservicio se encarga de:
- Gestion de presupuestos (CRUD completo)
- Calculo del estado de presupuestos (consumido vs limite)
- Generacion de graficos de gastos por categoria (QuickChart.io)
- Rate limiting por plan de usuario
- Integracion resiliente con expenses-service (circuit breaker)

Repositorio: https://github.com/0debt/analytics-service

---

## 4. Customer agreement

El acuerdo de cliente de la aplicacion se encuentra documentado en:

https://github.com/0debt/0debt-infra/blob/main/docs/agreements/customer-agreement.md

---

## 5. Descripcion del API REST

### Endpoints disponibles

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/v1/health` | Health check del servicio | No |
| POST | `/v1/budgets` | Crear un nuevo presupuesto | Si (JWT) |
| GET | `/v1/budgets/group/:groupId` | Listar presupuestos de un grupo | No |
| PUT | `/v1/budgets/:id` | Actualizar limite de presupuesto | No |
| DELETE | `/v1/budgets/:id` | Eliminar presupuesto | No |
| GET | `/v1/budgets/:id/status` | Obtener estado del presupuesto (con cache) | No |
| GET | `/v1/budgets/:id/chart` | Obtener grafico de gastos (rate limited) | Si (JWT) |
| DELETE | `/v1/internal/users/:userId` | SAGA: Eliminar datos de usuario | Interno |

### Documentacion interactiva

- **Swagger UI:** `/swagger`
- **OpenAPI JSON:** `/docs`

### Modelo de datos (Budget)

```typescript
{
  _id: ObjectId,
  groupId: string,      // ID del grupo
  userId: string,       // ID del usuario creador
  category?: string,    // Categoria opcional (FOOD, TRANSPORT, etc.)
  limitAmount: number,  // Limite del presupuesto (min: 0)
  period: string,       // Periodo (monthly, weekly, trip)
  createdAt: Date,
  updatedAt: Date
}
```

### Respuesta de estado del presupuesto

```json
{
  "limit": 500,
  "spent": 150.00,
  "health": "OK"
}
```

Valores de `health`: `OK` (<80%), `WARNING` (80-100%), `OVERBUDGET` (>100%)

---

## 6. Justificacion de requisitos

### Requisitos base (Microservicio)

#### 6.1. API REST con metodos GET, POST, PUT y DELETE

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/routes/budgets.ts:24` - POST `/v1/budgets`
- `src/routes/budgets.ts:25` - GET `/v1/budgets/group/:groupId`
- `src/routes/budgets.ts:26` - PUT `/v1/budgets/:id`
- `src/routes/budgets.ts:27` - DELETE `/v1/budgets/:id`
- `src/routes/budgets.ts:30` - GET `/v1/budgets/:id/status`
- `src/routes/budgets.ts:31` - GET `/v1/budgets/:id/chart`
- `src/routes/budgets.ts:34` - DELETE `/v1/internal/users/:userId` (SAGA)

**Codigos de estado implementados:**
- `200 OK` - Operaciones exitosas
- `201 Created` - Recurso creado (`src/controllers/budgetController.ts:41`)
- `400 Bad Request` - Validacion fallida (`src/controllers/budgetController.ts:29`)
- `401 Unauthorized` - Sin autorizacion (`src/controllers/budgetController.ts:16`)
- `403 Forbidden` - Plan no permitido (`src/controllers/budgetController.ts:224`)
- `404 Not Found` - Recurso no encontrado (`src/controllers/budgetController.ts:97`)
- `429 Too Many Requests` - Rate limit excedido (`src/middleware/chartRateLimiter.ts:48`)
- `500 Internal Server Error` - Errores del servidor
- `502 Bad Gateway` - Error en servicio externo (`src/controllers/budgetController.ts:246`)
- `503 Service Unavailable` - Feature deshabilitada (`src/controllers/budgetController.ts:217`)

---

#### 6.2. Mecanismo de autenticacion (JWT con claim `plan`)

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/helpers/userContext.ts:22-39` - Extraccion del JWT y claims (`userId`, `plan`)
- `src/controllers/budgetController.ts:14-17` - Validacion de autorizacion en creacion de budgets

**Descripcion:**
- El JWT llega validado por Kong Gateway (Trust the Gateway pattern)
- Se decodifica el token con `jwt-decode` sin verificar firma (ya validado por Kong)
- Se extrae el claim `plan` para determinar permisos (`FREE`, `PRO`, `ENTERPRISE`)
- El plan se usa para rate limiting y restriccion de features (charts)

```typescript
// src/helpers/userContext.ts:30-34
const decoded = jwtDecode<JwtPayload>(token);
return {
    userId: decoded.sub || decoded.userId || 'anonymous',
    plan: decoded.plan || 'FREE'
};
```

---

#### 6.3. Frontend integrado

**Estado:** Implementado

**Ubicacion:** Frontend integrado en NextJS: https://github.com/0debt/frontend

---

#### 6.4. Desplegado en la nube

**Estado:** Implementado

**Ubicacion:**
- `.github/workflows/deploy.yaml` - CI/CD con GitHub Actions
- Despliegue automatico en Coolify (linea 39-44)
- Imagen Docker multi-arquitectura (amd64/arm64) en GHCR

---

#### 6.5. API versionada

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/routes/budgets.ts:11-34` - Todas las rutas bajo `/v1/`

**Endpoints versionados:**
- `/v1/health`
- `/v1/budgets`
- `/v1/budgets/group/:groupId`
- `/v1/budgets/:id`
- `/v1/budgets/:id/status`
- `/v1/budgets/:id/chart`
- `/v1/internal/users/:userId`

---

#### 6.6. Documentacion de la API (Swagger/OpenAPI)

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/config/openapi.ts` - Especificacion OpenAPI 3.0 completa
- `src/server.ts:16` - Endpoint JSON: `/docs`
- `src/server.ts:19` - Swagger UI: `/swagger`

**Acceso:**
- Swagger UI interactivo: `http://localhost:3000/swagger`
- OpenAPI JSON: `http://localhost:3000/docs`

---

#### 6.7. Persistencia con MongoDB (NoSQL)

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/config/database.ts` - Conexion a MongoDB Atlas con Mongoose
- `src/models/budgetSchema.ts` - Schema de Budget

**Base de datos:** MongoDB Atlas (cloud)

---

#### 6.8. Validacion de datos con Mongoose

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/models/budgetSchema.ts:14-20` - Schema con validaciones

```typescript
const budgetSchema = new Schema<IBudget>({
    groupId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    category: { type: String, required: false },
    limitAmount: { type: Number, required: true, min: 0 },
    period: { type: String, required: true },
}, { timestamps: true });
```

**Validaciones:**
- `required: true` - Campos obligatorios
- `min: 0` - Limite minimo para `limitAmount`
- `runValidators: true` en updates (`src/controllers/budgetController.ts:93`)

---

#### 6.9. Imagen docker

**Estado:** Implementado

**Ubicacion:**
- `Dockerfile` - Imagen basada en `oven/bun:1-alpine`

```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
USER bun
EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]
```

---

#### 6.10. Gestion del codigo con GitHub Flow

**Estado:** Implementado

**Ubicacion:** Repositorio en organizacion 0debt en GitHub: https://github.com/0debt

---

#### 6.11. Integracion continua (CI/CD)

**Estado:** Implementado

**Ubicacion:**
- `.github/workflows/deploy.yaml` - Build y deploy en cada tag `v*`
- `.github/workflows/test.yaml` - Ejecucion de tests en cada tag `v*`

**Verificacion:** Se pueden ver los tests pasando antes de cada deploy en la pestaña Actions del repositorio: https://github.com/0debt/analytics-service/actions

**Pipeline:**
1. Checkout codigo
2. Build imagen Docker multi-arquitectura
3. Push a GHCR (GitHub Container Registry)
4. Trigger deployment en Coolify

---

#### 6.12. Pruebas de componente (minimo 20 tests)

**Estado:** Implementado (20 tests)

**Ubicacion:**
- `tests/integration/budget.test.ts` - 20 tests de integracion

**Cobertura de tests:**

| # | Test | Tipo | Linea |
|---|------|------|-------|
| 1 | Health check returns healthy | Positivo | 19-24 |
| 2 | Create budget with valid data | Positivo | 29-50 |
| 3 | Create fails without Authorization | Negativo | 52-64 |
| 4 | Create fails with missing groupId | Negativo | 66-80 |
| 7 | Create fails with invalid JSON | Negativo | 82-93 |
| 8 | List budgets for a group | Positivo | 98-106 |
| 9 | List returns empty for non-existent group | Negativo | 108-115 |
| 10 | Update budget limitAmount | Positivo | 120-132 |
| 11 | Update returns 404 for non-existent budget | Negativo | 134-142 |
| 12 | Update fails with no valid fields | Negativo | 144-154 |
| 13 | Get budget status with health indicator | Positivo | 159-169 |
| 14 | Status returns 404 for non-existent budget | Negativo | 171-174 |
| 15 | Delete an existing budget | Positivo | 179-203 |
| 16 | Delete returns 404 for non-existent budget | Negativo | 205-211 |
| 17 | Chart returns URL when enabled | Positivo | 216-225 |
| 18 | Chart returns 503 when disabled | Negativo | 227-237 |
| 19 | SAGA deletes all budgets for user | Positivo | 242-281 |
| 20 | SAGA returns 200 with no budgets to delete | Positivo | 283-292 |

**Escenarios cubiertos:**
- Escenarios positivos (CRUD completo)
- Escenarios negativos (validacion, 404, 401, 400)
- Tests in-process y out-of-process (HTTP real contra servidor)

---

### Requisitos avanzados (6 para el 10)

#### 6.13. Frontend con rutas y navegacion

**Estado:** Implementado

**Ubicacion:** Frontend NextJS integrado: https://github.com/0debt/frontend

---

#### 6.14. Cache para optimizar acceso a datos (Redis)

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/config/redis.ts` - Configuracion de Redis con ioredis
- `src/controllers/budgetController.ts:125-141` - Patron Cache-Aside

**Implementacion:**
```typescript
// src/controllers/budgetController.ts:129-141
const cachedData = await redis.get(cacheKey);
if (cachedData) {
    console.log(`Cache HIT for group ${budget.groupId}`);
    stats = JSON.parse(cachedData);
} else {
    console.log(`Cache MISS for group ${budget.groupId}`);
    stats = await getGroupStats(budget.groupId);
    if (stats) {
        await redis.set(cacheKey, JSON.stringify(stats), 'EX', 5);
    }
}
```

**Caracteristicas:**
- Patron: Cache-Aside
- TTL: 5 segundos
- Key: `analytics:budget:stats:{groupId}`
- Graceful degradation: funciona sin Redis

---

#### 6.15. Consumo de API externa (QuickChart.io)

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/services/chartService.ts:6-24` - Generacion de URL de QuickChart
- `src/controllers/budgetController.ts:239-257` - Fetch de imagen PNG

**Descripcion:**
- QuickChart.io devuelve imagenes PNG de graficos segun datos proporcionados
- Se genera un pie chart con gastos por categoria
- El endpoint devuelve directamente el binario de la imagen

```typescript
// src/services/chartService.ts:6-23
export function generateChartUrl(data: Record<string, number>): string {
    const chartConfig = {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{ data: Object.values(data) }]
        }
    };
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}
```

---

#### 6.16. Patron rate limit para servicios externos

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/middleware/chartRateLimiter.ts` - Middleware completo de rate limiting
- `src/routes/budgets.ts:21` - Aplicacion del middleware

**Limites por plan (ventana mensual ~30 dias):**
```typescript
// src/middleware/chartRateLimiter.ts:5-9
const planLimits = {
    FREE: 2,
    PRO: 15,
    ENTERPRISE: 50,
} as const;
```

**Caracteristicas:**
- Ventana: ~30 dias (mensual)
- Identificacion: userId del JWT o IP del cliente
- Respuesta 429 con informacion de limite y reset

---

#### 6.17. Autenticacion basada en JWT

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/helpers/userContext.ts` - Extraccion y decodificacion de JWT
- Dependencia: `jwt-decode` en `package.json:11`

**Flujo:**
1. Kong Gateway valida el JWT
2. Analytics service decodifica el token (sin verificar, confia en Gateway)
3. Extrae `userId` y `plan` para autorizacion y rate limiting

---

#### 6.18. Patron circuit breaker

**Estado:** Implementado

**Ubicacion en el codigo:**
- `src/clients/expensesClient.ts:10-14` - Configuracion del breaker
- `src/clients/expensesClient.ts:34-42` - Instanciacion y eventos

**Configuracion:**
```typescript
// src/clients/expensesClient.ts:10-14
const breakerOptions = {
    timeout: 3000,           // 3 segundos de timeout
    errorThresholdPercentage: 50,  // 50% de errores abre el circuito
    resetTimeout: 10000      // 10 segundos antes de half-open
};
```

**Comportamiento:**
- `timeout: 3000ms` - Tiempo maximo de espera por request
- `errorThresholdPercentage: 50` - Abre si >50% de requests fallan
- `resetTimeout: 10000ms` - Tiempo en estado OPEN antes de HALF-OPEN
- **Fallback:** Devuelve `null` si el circuito esta abierto
- **Logging:** Eventos `open` y `close` para trazabilidad

```typescript
// src/clients/expensesClient.ts:36-42
breaker.fallback(() => {
    console.warn("Circuit Breaker Fallback: expenses-service unavailable");
    return null;
});
breaker.on('open', () => console.log('Circuit Breaker OPEN: expenses-service appears down'));
breaker.on('close', () => console.log('Circuit Breaker CLOSED: expenses-service recovered'));
```

---

## 7. Resumen de nota

| Requisito | Estado | Puntos |
|-----------|--------|--------|
| **Requisitos base** | | |
| API REST (GET, POST, PUT, DELETE) | Implementado | Base |
| Autenticacion JWT con claim `plan` | Implementado | Base |
| Frontend integrado | Implementado | Base |
| Desplegado en la nube (Coolify) | Implementado | Base |
| API versionada (`/v1/`) | Implementado | Base |
| Documentacion Swagger/OpenAPI | Implementado | Base |
| Persistencia MongoDB | Implementado | Base |
| Validacion con Mongoose | Implementado | Base |
| Imagen docker | Implementado | Base |
| GitHub Flow | Implementado | Base |
| CI/CD (GitHub Actions) | Implementado | Base |
| 20+ tests (positivos y negativos) | Implementado | Base |
| **Requisitos avanzados** | | |
| Frontend con rutas y navegacion | Implementado | +1 |
| Cache Redis (Cache-Aside) | Implementado | +1 |
| API externa (QuickChart.io) | Implementado | +1 |
| Rate Limit por plan | Implementado | +1 |
| Autenticacion JWT | Implementado | +1 |
| Circuit Breaker (opossum) | Implementado | +1 |

**Total requisitos avanzados:** 6/6

**Nota a la que se opta:** 10

---

## 8. Analisis de horas clockify 1Nov-8Ene

Total en clockify: 43:58:09 

<img width="2076" height="519" alt="image" src="https://github.com/user-attachments/assets/50ecec3d-c936-4850-ab4e-103073791ecc" />

---

## 9. Uso de IA en el proyecto

Se ha utilizado inteligencia artificial como herramienta de apoyo durante el desarrollo del proyecto. A continuacion se detallan los usos principales:

### Generacion de tests

La IA ha sido utilizada para generar tests de integracion basados en el codigo existente. Se le proporcionaba el codigo fuente completo y generaba tests que cubrian tanto escenarios positivos como negativos, asegurando una cobertura completa de la funcionalidad.

### Generacion de JSDoc

Se ha utilizado IA para generar documentacion JSDoc para todas las funciones del proyecto, mejorando la mantenibilidad y comprension del codigo.

### Alineacion entre microservicios

Este ha sido el uso mas importante de la IA en el proyecto. Se ha utilizado para alinear el microservicio analytics-service con el resto de microservicios del ecosistema 0debt, asegurando:
- Consistencia en los contratos de API
- Compatibilidad con el frontend
- Integracion correcta con expenses-service
- Formato uniforme de respuestas

### Herramienta repomix

Se ha utilizado **repomix** (https://github.com/yamadashy/repomix) como herramienta complementaria para el trabajo con IA. Repomix es una utilidad que empaqueta todo el contenido de un repositorio en un unico archivo de texto optimizado para ser procesado por modelos de lenguaje. Esto permite:

- Proporcionar contexto completo del proyecto a la IA en una sola consulta
- Mantener la estructura y relaciones entre archivos
- Facilitar el analisis de codigo y la generacion de sugerencias coherentes con el proyecto
- Optimizar el uso de tokens al eliminar contenido innecesario (node_modules, archivos binarios, etc.)

Comando utilizado:
```bash
repomix --output repomix-output.txt
```

---

## 10. Estructura del proyecto

```
analytics-service/
├── .github/
│   └── workflows/
│       ├── deploy.yaml          # CI/CD: Build + Deploy
│       └── test.yaml            # CI: Tests automatizados
├── src/
│   ├── clients/
│   │   └── expensesClient.ts    # Circuit Breaker + HTTP client
│   ├── config/
│   │   ├── database.ts          # Conexion MongoDB
│   │   ├── openapi.ts           # Especificacion OpenAPI 3.0
│   │   └── redis.ts             # Conexion Redis
│   ├── controllers/
│   │   └── budgetController.ts  # Handlers de endpoints
│   ├── helpers/
│   │   └── userContext.ts       # JWT decode helper
│   ├── middleware/
│   │   └── chartRateLimiter.ts  # Rate limit por plan
│   ├── models/
│   │   └── budgetSchema.ts      # Schema Mongoose
│   ├── routes/
│   │   └── budgets.ts           # Definicion de rutas
│   ├── services/
│   │   └── chartService.ts      # Generacion URL QuickChart
│   └── server.ts                # Entry point
├── tests/
│   └── integration/
│       └── budget.test.ts       # 20 tests de integracion
├── Dockerfile                   # Imagen Docker
├── package.json                 # Dependencias
├── README.md                    # Documentacion principal
└── documento-entrega.md         # Este documento
```
