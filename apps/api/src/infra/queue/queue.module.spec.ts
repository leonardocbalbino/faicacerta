import { describe, expect, it } from 'vitest';
import { redisOptionsFromUrl } from './queue.module.js';

describe('redisOptionsFromUrl', () => {
  it('lê host e porta', () => {
    expect(redisOptionsFromUrl('redis://localhost:6379')).toMatchObject({
      host: 'localhost',
      port: 6379,
      password: undefined,
      db: undefined,
      tls: undefined,
      maxRetriesPerRequest: null,
    });
  });

  it('lê senha, banco e TLS', () => {
    expect(redisOptionsFromUrl('rediss://default:s%40nha@cache.example.com:6380/2')).toMatchObject({
      host: 'cache.example.com',
      port: 6380,
      username: 'default',
      password: 's@nha',
      db: 2,
      tls: {},
    });
  });
});
