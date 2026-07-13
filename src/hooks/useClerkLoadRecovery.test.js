import { act, renderHook } from '@testing-library/react';
import {
  CLERK_LOAD_TIMEOUT_MS,
  CLERK_RESUME_TIMEOUT_MS,
  useClerkLoadRecovery,
} from './useClerkLoadRecovery';

const mockReloadOnce = jest.fn(() => true);

jest.mock('../utils/reloadOnce', () => ({
  reloadOnce: (...args) => mockReloadOnce(...args),
}));

describe('useClerkLoadRecovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReloadOnce.mockClear();
    mockReloadOnce.mockReturnValue(true);
    delete window.__CRYPTOLOGICAL_CLERK_LOADED__;
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete window.__CRYPTOLOGICAL_CLERK_LOADED__;
  });

  test('marks clerk loaded when isLoaded becomes true', () => {
    const { result, rerender } = renderHook(
      ({ loaded }) => useClerkLoadRecovery(loaded),
      { initialProps: { loaded: false } }
    );

    expect(window.__CRYPTOLOGICAL_CLERK_LOADED__).toBe(false);
    expect(result.current.stuck).toBe(false);

    rerender({ loaded: true });
    expect(window.__CRYPTOLOGICAL_CLERK_LOADED__).toBe(true);
    expect(result.current.stuck).toBe(false);
    expect(mockReloadOnce).not.toHaveBeenCalled();
  });

  test('auto-reloads after load timeout while still unloaded', () => {
    const { result } = renderHook(() => useClerkLoadRecovery(false));

    act(() => {
      jest.advanceTimersByTime(CLERK_LOAD_TIMEOUT_MS - 1);
    });
    expect(mockReloadOnce).not.toHaveBeenCalled();
    expect(result.current.stuck).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockReloadOnce).toHaveBeenCalledWith('clerk-load-timeout');
    expect(result.current.stuck).toBe(true);
  });

  test('uses shorter resume timeout after visibility restore', () => {
    let visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });

    renderHook(() => useClerkLoadRecovery(false));

    act(() => {
      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    act(() => {
      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    act(() => {
      jest.advanceTimersByTime(CLERK_RESUME_TIMEOUT_MS);
    });

    expect(mockReloadOnce).toHaveBeenCalledWith('clerk-load-timeout-after-resume');
  });

  test('does not reload if clerk loads before timeout', () => {
    const { rerender } = renderHook(
      ({ loaded }) => useClerkLoadRecovery(loaded),
      { initialProps: { loaded: false } }
    );

    act(() => {
      jest.advanceTimersByTime(CLERK_LOAD_TIMEOUT_MS / 2);
    });
    rerender({ loaded: true });

    act(() => {
      jest.advanceTimersByTime(CLERK_LOAD_TIMEOUT_MS);
    });

    expect(mockReloadOnce).not.toHaveBeenCalled();
    expect(window.__CRYPTOLOGICAL_CLERK_LOADED__).toBe(true);
  });
});
