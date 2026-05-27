import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import logger from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('React ErrorBoundary caught an error', { error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Optional: trigger a soft reload of the affected area
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'error.main',
            borderRadius: 2,
            backgroundColor: 'background.paper',
            m: 2,
          }}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {this.props.fallbackMessage || 'An unexpected error occurred while loading this section.'}
          </Typography>
          <Button variant="outlined" color="error" onClick={this.handleReset}>
            Try again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
