/**
 * PM2 Ecosystem Configuration
 * For production deployment with PM2 process manager
 */

module.exports = {
  apps: [
    {
      name: 'inventory-api',
      script: './src/server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Development environment
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },

      // Staging environment
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000
      },

      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Logging configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Auto restart configuration
      autorestart: true,
      watch: false, // Set to true for development
      max_memory_restart: '512M',
      restart_delay: 4000,

      // Advanced options
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000,
      listen_timeout: 8000,

      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Merge logs
      merge_logs: true,

      // Interpreter
      interpreter: 'node',
      interpreter_args: '--max-old-space-size=512',

      // Source map support
      source_map_support: true,

      // Instance variables
      instance_var: 'INSTANCE_ID',

      // Graceful shutdown
      shutdown_with_message: true,
      wait_ready: true,
      listen_timeout: 10000,

      // Cron restart (restart at 2 AM daily)
      cron_restart: '0 2 * * *',

      // Node.js specific options
      node_args: [
        '--max-old-space-size=512',
        '--optimize-for-size'
      ],

      // Ignore watch patterns
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        'coverage',
        'tests'
      ],

      // Environment file
      env_file: '.env'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'your-git-repository-url',
      path: '/var/www/inventory-api',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'post-setup': 'ls -la'
    },

    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'your-git-repository-url',
      path: '/var/www/inventory-api-staging',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env staging'
    }
  }
};