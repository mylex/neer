import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout';
import PropertyListPage from './pages/PropertyListPage';
import PropertyDetailPage from './pages/PropertyDetailPage';

const App: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Layout>
        <Routes>
          <Route path="/" element={<PropertyListPage />} />
          <Route path="/properties" element={<PropertyListPage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
        </Routes>
      </Layout>
    </Box>
  );
};

export default App;