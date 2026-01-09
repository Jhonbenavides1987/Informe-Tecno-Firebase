import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext'; // Importo useAuth

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import DashboardPrepagoPage from './pages/DashboardPrepagoPage';
import UploadPrepagoPage from './pages/UploadPrepagoPage';
import DashboardDurablePage from './pages/DashboardDurablePage';
import UploadDurablePage from './pages/UploadDurablePage';
import DashboardActivacionPage from './pages/DashboardActivacionPage';
import UploadActivacionPage from './pages/UploadActivacionPage';
import DashboardAliadosPage from './pages/DashboardAliadosPage';
import UploadAliadosPage from './pages/UploadAliadosPage';
import DashboardCalendariosPage from './pages/DashboardCalendariosPage';
import UploadCalendariosPage from './pages/UploadCalendariosPage';
import DashboardPortaAfichesPage from './pages/DashboardPortaAfichesPage';
import UploadPortaAfichesPage from './pages/UploadPortaAfichesPage';
import CargarDatosPlaneacion from './pages/CargarDatosPlaneacion';
import DashboardPlaneacionPage from './pages/DashboardPlaneacionPage';
import CargaModulosPage from './pages/CargaModulosPage';
import { Box } from '@mui/material';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

const AppContent = () => {
  // Usamos el hook useAuth para obtener el usuario del contexto
  const { user } = useAuth();

  return (
    <Box sx={{ display: 'flex' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px', width: '100%' }}>
        <Routes>
          {/* Ruta de Inicio */}
          <Route path="/" element={<DashboardPage />} />

          {/* Pasamos el prop 'user' a todas las páginas de carga */}
          <Route path="/carga-de-modulos" element={<ProtectedRoute><CargaModulosPage /></ProtectedRoute>} />
          <Route path="/upload-pospago" element={<ProtectedRoute><UploadPage user={user} /></ProtectedRoute>} />
          <Route path="/upload-prepago" element={<ProtectedRoute><UploadPrepagoPage user={user} /></ProtectedRoute>} />
          <Route path="/upload-durable" element={<ProtectedRoute><UploadDurablePage user={user} /></ProtectedRoute>} />
          <Route path="/upload-activacion" element={<ProtectedRoute><UploadActivacionPage user={user} /></ProtectedRoute>} />
          <Route path="/upload-aliados" element={<ProtectedRoute><UploadAliadosPage user={user} /></ProtectedRoute>} />
          <Route path="/upload-calendarios" element={<ProtectedRoute><UploadCalendariosPage user={user} /></ProtectedRoute>} />
          <Route path="/upload-porta-afiches" element={<ProtectedRoute><UploadPortaAfichesPage user={user} /></ProtectedRoute>} />
          <Route path="/upload-planeacion" element={<ProtectedRoute><CargarDatosPlaneacion user={user} /></ProtectedRoute>} />
          
          {/* Rutas Públicas */}
          <Route path="/dashboard-pospago" element={<DashboardPage />} />
          <Route path="/dashboard-prepago" element={<DashboardPrepagoPage />} />
          <Route path="/dashboard-durable" element={<DashboardDurablePage />} />
          <Route path="/dashboard-activacion" element={<DashboardActivacionPage />} />
          <Route path="/dashboard-aliados" element={<DashboardAliadosPage />} />
          <Route path="/dashboard-calendarios" element={<DashboardCalendariosPage />} />
          <Route path="/dashboard-porta-afiches" element={<DashboardPortaAfichesPage />} />
          <Route path="/dashboard-planeacion" element={<DashboardPlaneacionPage />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default App;
