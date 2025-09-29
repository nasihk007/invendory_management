const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Inventory Management API',
      version: '1.0.0',
      description: 'A comprehensive inventory management system API with JWT authentication, product management, stock tracking, audit logging, and notifications.',
      contact: {
        name: 'API Support',
        email: 'support@inventory-api.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.inventory.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
              example: 1
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              description: 'Unique username',
              example: 'john_doe'
            },
            email: {
              type: 'string',
              format: 'email',
              maxLength: 100,
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            role: {
              type: 'string',
              enum: ['staff', 'manager'],
              description: 'User role',
              example: 'staff'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp'
            }
          }
        },
        UserRegistration: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              description: 'Unique username',
              example: 'john_doe'
            },
            email: {
              type: 'string',
              format: 'email',
              maxLength: 100,
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'Password (min 8 chars, must contain letter and number)',
              example: 'SecurePass123'
            },
            role: {
              type: 'string',
              enum: ['staff', 'manager'],
              description: 'User role (manager role requires manager permissions)',
              example: 'staff'
            }
          }
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            password: {
              type: 'string',
              description: 'User password',
              example: 'SecurePass123'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User'
            },
            token: {
              type: 'string',
              description: 'JWT token for authentication',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            expiresIn: {
              type: 'string',
              description: 'Token expiration time',
              example: '24h'
            }
          }
        },
        Product: {
          type: 'object',
          required: ['sku', 'name', 'category', 'price'],
          properties: {
            id: {
              type: 'integer',
              description: 'Product ID',
              example: 1
            },
            sku: {
              type: 'string',
              maxLength: 50,
              pattern: '^[A-Z0-9-]+$',
              description: 'Stock Keeping Unit (uppercase letters, numbers, hyphens)',
              example: 'LAPTOP-001'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 255,
              description: 'Product name',
              example: 'Dell Laptop XPS 13'
            },
            description: {
              type: 'string',
              description: 'Product description',
              example: 'High-performance ultrabook with 16GB RAM'
            },
            category: {
              type: 'string',
              maxLength: 100,
              description: 'Product category',
              example: 'Electronics'
            },
            quantity: {
              type: 'integer',
              minimum: 0,
              description: 'Current stock quantity',
              example: 25
            },
            reorder_level: {
              type: 'integer',
              minimum: 0,
              description: 'Minimum stock level before reordering',
              example: 5
            },
            price: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              description: 'Product price',
              example: 999.99
            },
            location: {
              type: 'string',
              maxLength: 100,
              description: 'Storage location',
              example: 'Warehouse A-15'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Product creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Product last update timestamp'
            }
          }
        },
        ProductCreate: {
          type: 'object',
          required: ['sku', 'name', 'category', 'price'],
          properties: {
            sku: {
              type: 'string',
              maxLength: 50,
              pattern: '^[A-Z0-9-]+$',
              description: 'Stock Keeping Unit (uppercase letters, numbers, hyphens)',
              example: 'LAPTOP-001'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 255,
              description: 'Product name',
              example: 'Dell Laptop XPS 13'
            },
            description: {
              type: 'string',
              description: 'Product description',
              example: 'High-performance ultrabook with 16GB RAM'
            },
            category: {
              type: 'string',
              maxLength: 100,
              description: 'Product category',
              example: 'Electronics'
            },
            quantity: {
              type: 'integer',
              minimum: 0,
              description: 'Initial stock quantity',
              default: 0,
              example: 25
            },
            reorder_level: {
              type: 'integer',
              minimum: 0,
              description: 'Minimum stock level before reordering',
              default: 10,
              example: 5
            },
            price: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              description: 'Product price',
              example: 999.99
            },
            location: {
              type: 'string',
              maxLength: 100,
              description: 'Storage location',
              example: 'Warehouse A-15'
            }
          }
        },
        StockUpdate: {
          type: 'object',
          required: ['quantity', 'reason'],
          properties: {
            quantity: {
              type: 'integer',
              minimum: 0,
              description: 'New stock quantity',
              example: 30
            },
            reason: {
              type: 'string',
              minLength: 3,
              maxLength: 255,
              description: 'Reason for stock change',
              example: 'Received new shipment'
            },
            operation_type: {
              type: 'string',
              enum: ['manual_adjustment', 'sale', 'purchase', 'damage', 'transfer', 'correction'],
              description: 'Type of stock operation',
              default: 'manual_adjustment',
              example: 'purchase'
            }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Notification ID',
              example: 1
            },
            product_id: {
              type: 'integer',
              description: 'Related product ID',
              example: 1
            },
            message: {
              type: 'string',
              description: 'Notification message',
              example: 'Product quantity (3) is below reorder level (5)'
            },
            type: {
              type: 'string',
              enum: ['low_stock', 'out_of_stock', 'reorder_required'],
              description: 'Notification type',
              example: 'low_stock'
            },
            is_read: {
              type: 'boolean',
              description: 'Whether notification has been read',
              example: false
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Notification creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Notification last update timestamp'
            },
            Product: {
              $ref: '#/components/schemas/Product'
            }
          }
        },
        InventoryAudit: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Audit record ID',
              example: 1
            },
            product_id: {
              type: 'integer',
              description: 'Product ID',
              example: 1
            },
            user_id: {
              type: 'integer',
              description: 'User who made the change',
              example: 1
            },
            old_quantity: {
              type: 'integer',
              description: 'Previous quantity',
              example: 20
            },
            new_quantity: {
              type: 'integer',
              description: 'New quantity',
              example: 25
            },
            quantity_change: {
              type: 'integer',
              description: 'Calculated quantity change',
              example: 5
            },
            reason: {
              type: 'string',
              description: 'Reason for change',
              example: 'Received new shipment'
            },
            operation_type: {
              type: 'string',
              enum: ['manual_adjustment', 'sale', 'purchase', 'damage', 'transfer', 'correction'],
              description: 'Type of operation',
              example: 'purchase'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Audit record creation timestamp'
            },
            Product: {
              $ref: '#/components/schemas/Product'
            },
            User: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Resource not found'
            },
            details: {
              type: 'string',
              description: 'Additional error details',
              example: 'Product with ID 999 does not exist'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Validation error message',
              example: 'Validation failed'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email'
                  },
                  message: {
                    type: 'string',
                    example: 'Must be a valid email address'
                  }
                }
              }
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              description: 'Array of items'
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page number',
                  example: 1
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page',
                  example: 20
                },
                total: {
                  type: 'integer',
                  description: 'Total number of items',
                  example: 100
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total number of pages',
                  example: 5
                }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Unauthorized',
                details: 'Invalid or expired token',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access forbidden - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Forbidden',
                details: 'Manager role required for this operation',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Not Found',
                details: 'Product with ID 999 does not exist',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              }
            }
          }
        },
        ConflictError: {
          description: 'Resource conflict',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Conflict',
                details: 'Product with SKU LAPTOP-001 already exists',
                timestamp: '2024-01-15T10:30:00.000Z'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'User Management',
        description: 'User management operations for managers'
      },
      {
        name: 'Products',
        description: 'Product management operations'
      },
      {
        name: 'Stock Management',
        description: 'Inventory stock operations'
      },
      {
        name: 'Notifications',
        description: 'System notifications management'
      },
      {
        name: 'Audit Trail',
        description: 'Inventory audit trail and history tracking'
      },
      {
        name: 'Reports & Analytics',
        description: 'Inventory reports and analytics'
      },
      {
        name: 'File Operations',
        description: 'CSV import/export operations'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;