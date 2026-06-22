import { isChunkLoadError } from './isChunkLoadError';

describe('isChunkLoadError', () => {
  test('detects webpack ChunkLoadError by name', () => {
    expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'x' })).toBe(true);
  });

  test('detects webpack chunk message', () => {
    expect(isChunkLoadError(new Error('Loading chunk 42 failed.'))).toBe(true);
  });

  test('detects vite dynamic import failure', () => {
    expect(
      isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://example.com/chunk.js'))
    ).toBe(true);
  });

  test('ignores unrelated errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});