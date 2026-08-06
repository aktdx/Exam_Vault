import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ExamVault API',
      version: '1.0.0',
      description: 'API documentation for the Previous Year Question Papers platform',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Public API v1',
      },
      {
        url: '/api/v1/admin',
        description: 'Admin API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/server/routes/*.ts'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
