export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Analytics Service API',
    version: '1.0.0',
    description: 'API documentation for Analytics Service - Budget Management',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from Kong gateway',
      },
    },
  },
  paths: {
    '/v1/budgets': {
      post: {
        summary: 'Create a new budget',
        description: 'Create a new budget. Requires Authorization header with JWT token.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['groupId', 'limitAmount', 'period'],
                properties: {
                  groupId: { type: 'string', description: 'Group ID' },
                  category: { type: 'string', description: 'Category (optional)' },
                  limitAmount: { type: 'number', description: 'Budget limit amount' },
                  period: { type: 'string', description: 'Period (e.g., "monthly", "trip")' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Budget created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    groupId: { type: 'string' },
                    userId: { type: 'string' },
                    category: { type: 'string' },
                    limitAmount: { type: 'number' },
                    period: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Authorization required' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/v1/budgets/group/{groupId}': {
      get: {
        summary: 'List budgets by group',
        description: 'Get all budgets for a specific group',
        parameters: [
          {
            name: 'groupId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'The group ID',
          },
        ],
        responses: {
          '200': {
            description: 'List of budgets for the group',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    groupId: { type: 'string' },
                    budgets: {
                      type: 'array',
                      items: {
                        type: 'object',
                      },
                    },
                    count: { type: 'number' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
          },
        },
      },
    },
    '/v1/budgets/{id}': {
      put: {
        summary: 'Update budget limit',
        description: 'Modify the limit amount of a budget',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The budget ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  limitAmount: { type: 'number', description: 'New limit amount' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Budget updated successfully' },
          '400': { description: 'Validation error' },
          '404': { description: 'Budget not found' },
          '500': { description: 'Server error' },
        },
      },
      delete: {
        summary: 'Delete a budget',
        description: 'Delete a budget by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The budget ID',
          },
        ],
        responses: {
          '200': { description: 'Budget deleted successfully' },
          '404': { description: 'Budget not found' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/v1/budgets/{id}/status': {
      get: {
        summary: 'Get budget status',
        description: 'Get the current status of a budget including spending information (uses Redis cache)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The budget ID',
          },
        ],
        responses: {
          '200': {
            description: 'Budget status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    limit: { type: 'number' },
                    spent: { type: 'number' },
                    health: { type: 'string', enum: ['OK', 'WARNING', 'OVERBUDGET'] },
                  },
                },
              },
            },
          },
          '404': { description: 'Budget not found' },
          '500': { description: 'Failed to calculate status' },
        },
      },
    },
    '/v1/budgets/{id}/chart': {
      get: {
        summary: 'Get budget chart URL',
        description: 'Generate a QuickChart.io URL for budget visualization. Requires ENABLE_CHARTS=true.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The budget ID',
          },
        ],
        responses: {
          '200': {
            description: 'Chart URL generated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', description: 'QuickChart.io URL' },
                  },
                },
              },
            },
          },
          '404': { description: 'Budget not found' },
          '503': { description: 'Feature Disabled (ENABLE_CHARTS=false)' },
        },
      },
    },
    '/v1/internal/users/{userId}': {
      delete: {
        summary: 'SAGA: Delete user budgets',
        description: 'Internal endpoint for SAGA pattern. Deletes all budgets for a user during user deletion flow.',
        tags: ['Internal'],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The user ID',
          },
        ],
        responses: {
          '200': {
            description: 'Budgets deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    deletedCount: { type: 'number' },
                  },
                },
              },
            },
          },
          '500': { description: 'SAGA failed' },
        },
      },
    },
  },
};

