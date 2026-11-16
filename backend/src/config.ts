import type { PoolOptions } from 'mysql2/promise';

export interface Config {
  port: number;
  db: PoolOptions;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const required = (name: string): string => {
    const value = env[name];
    if (value === undefined || value.trim() === '') {
      throw new Error(`Missing configuration: ${name}`);
    }
    return value;
  };
  const port = (value: string, name: string): number => {
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
      throw new Error(`Invalid port: ${name}`);
    }
    return Number(value);
  };
  const user = required('APP_MYSQL_USER');
  const database = required('APP_MYSQL_DATABASE');
  if (user.toLowerCase() === 'root' || user.toLowerCase() === 'partstock_lab' || database !== 'partstock') {
    throw new Error('Use the partstock application database and a non-root application account');
  }
  return {
    port: port(env.PORT ?? '3000', 'PORT'),
    db: {
      host: required('APP_MYSQL_HOST'),
      port: port(required('APP_MYSQL_PORT'), 'APP_MYSQL_PORT'),
      database,
      user,
      password: required('APP_MYSQL_PASSWORD'),
      connectionLimit: 5,
      connectTimeout: 5000,
      supportBigNumbers: true,
      bigNumberStrings: true,
    },
  };
}
