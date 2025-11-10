import dotenv from 'dotenv';

if (!globalThis.__PI2_ENV_LOADED) {
  dotenv.config();
  globalThis.__PI2_ENV_LOADED = true;
}

export const env = process.env;
