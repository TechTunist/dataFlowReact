/**
 * Component test using @testing-library/react for a small polished component (LoadingFallback).
 * MODERN AGENT: demonstrates real component testing added in sprint (t3).
 * LoadingFallback used in App.js lazy routes + Workbench + ErrorBoundary.
 * Wraps MUI to avoid theme context errors in isolated test.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoadingFallback from './LoadingFallback';

const theme = createTheme();

const renderWithTheme = (ui) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('LoadingFallback (polished component)', () => {
  test('renders default loading message and progress', () => {
    renderWithTheme(<LoadingFallback />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    // CircularProgress renders as role progress or svg
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders custom message', () => {
    renderWithTheme(<LoadingFallback message="Fetching data..." />);
    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });
});
