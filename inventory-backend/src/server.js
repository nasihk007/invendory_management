require('dotenv').config();
const createApp = require('./app');
const { initializeDatabase, closeDatabaseConnection } = require('./database/database.providers');
const chalk = require('chalk'); // For colored console output


/**
 * Start the server with enhanced initialization
 */
async function startServer() {
  let sequelize = null;

  try {
    // Initialize database with provider pattern
    const dbProvider = await initializeDatabase();
    sequelize = dbProvider.sequelize;
    const { configService } = dbProvider;

    // Create Express app with database provider
    const app = createApp(dbProvider);

    // Start server
    const appInfo = configService.getAppInfo();
    const server = app.listen(appInfo.port, () => {
      console.log(`Server is running on port ${appInfo.port}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      server.close(async () => {
        try {
          await closeDatabaseConnection(sequelize);
        } catch (error) {
          // Silent error handling
        }
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      process.exit(1);
    });

    return server;

  } catch (error) {
    console.error('Failed to start server:', error.message);

    // Clean up database connection if it exists
    if (sequelize) {
      try {
        await closeDatabaseConnection(sequelize);
      } catch (cleanupError) {
        // Silent cleanup
      }
    }

    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };