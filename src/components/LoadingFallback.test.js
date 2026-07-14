/**
 * Component test using @testing-library/react for a small polished component (LoadingFallback).
 * MODERN AGENT: demonstrates real component testing added in sprint (t3).
 * LoadingFallback used in App.js lazy routes + Workbench + ErrorBoundary.
 * Wraps MUI to avoid theme context errors in isolated test.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoadingFallback, { LOADING_FALLBACK_STUCK_MS } from './LoadingFallback';

const mockHardNavigateReload = jest.fn();

jest.mock('../utils/reloadOnce', () => ({
  hardNavigateReload: (...args) => mockHardNavigateReload(...args),
}));

const theme = createTheme();

const renderWithTheme = (ui) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('LoadingFallback (polished component)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockHardNavigateReload.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders default loading message and progress', () => {
    renderWithTheme(<LoadingFallback />);
    expect(screen.getByText(/Loading chart/i)).toBeInTheDocument();
    // CircularProgress renders as role progress or svg
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders custom message', () => {
    renderWithTheme(<LoadingFallback message="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  test('shows reload UI after stuck timeout', () => {
    renderWithTheme(<LoadingFallback message="Loading..." />);

    act(() => {
      jest.advanceTimersByTime(LOADING_FALLBACK_STUCK_MS);
    });

    expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
});
