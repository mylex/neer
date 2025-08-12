import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout';
import PropertyListPage from './pages/PropertyListPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error caught by ErrorBoundary:', error, errorInfo);
    }
    
    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  };

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Layout>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<PropertyListPage />} />
              <Route path="/properties" element={<PropertyListPage />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
            </Routes>
          </ErrorBoundary>
        </Layout>
      </Box>
    </ErrorBoundary>
  );
};

export default App;