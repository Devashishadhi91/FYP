require('dotenv').config();

/**
 * Validates that all required environment variables are present and non-empty.
 * If any are missing, logs an error and terminates the process.
 */
const validateEnv = () => {
  const requiredEnvVars = [
    'MONGODB_URL',
    'SecretKey',
    'CLOUD_NAME',
    'API_KEY',
    'API_SECRET',
    'PORT'
  ];

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar] || process.env[envVar].trim() === '');

  if (missingVars.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', 'CRITICAL ERROR: Missing Environment Variables');
    console.error('The following required environment variables are not defined or are empty:');
    
    missingVars.forEach(envVar => {
      console.error(`\x1b[33m   [!] ${envVar}\x1b[0m`);
    });

    console.error('\nStopping the server. Please check your .env file and try again.');
    process.exit(1);
  }
};

module.exports = validateEnv;
