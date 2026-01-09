import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px' }}>
        <Routes>
          {/* Ruta de Inicio */}
          <Route path="/" element={<DashboardPage />} />

          <Route 
            path="/carga-de-modulos"
            element={<ProtectedRoute><CargaModulosPage /></ProtectedRoute>}
          />

          {/* Rutas Pospago */}
          <Route path="/dashboard-pospago" element={<DashboardPage />} />
          <Route 
            path="/upload-pospago" 
            element={<ProtectedRoute><UploadPage /></ProtectedRoute>}
          />

          {/* Rutas Prepago */}
          <Route path="/dashboard-prepago" element={<DashboardPrepagoPage />} />
          <Route 
            path="/upload-prepago" 
            element={<ProtectedRoute><UploadPrepagoPage /></ProtectedRoute>}
          />

          {/* Rutas Durable */}
          <Route path="/dashboard-durable" element={<DashboardDurablePage />} />
          <Route 
            path="/upload-durable" 
            element={<ProtectedRoute><UploadDurablePage /></ProtectedRoute>}
          />

          {/* Rutas Activación */}
          <Route path="/dashboard-activacion" element={<DashboardActivacionPage />} />
          <Route 
            path="/upload-activacion" 
            element={<ProtectedRoute><UploadActivacionPage /></ProtectedRoute>}
          />

          {/* Rutas Aliados */}
          <Route path="/dashboard-aliados" element={<DashboardAliadosPage />} />
          <Route 
            path="/upload-aliados" 
            element={<ProtectedRoute><UploadAliadosPage /></ProtectedRoute>}
          />

          {/* Rutas Calendarios */}
          <Route path="/dashboard-calendarios" element={<DashboardCalendariosPage />} />
          <Route 
            path="/upload-calendarios" 
            element={<ProtectedRoute><UploadCalendariosPage /></ProtectedRoute>}
          />

           {/* Rutas Porta Afiches */}
          <Route path="/dashboard-porta-afiches" element={<DashboardPortaAfichesPage />} />
          <Route 
            path="/upload-porta-afiches" 
            element={<ProtectedRoute><UploadPortaAfichesPage /></ProtectedRoute>}
          />

          {/* Rutas Planeación */}
          <Route path="/dashboard-planeacion" element={<DashboardPlaneacionPage />} />
          <Route 
            path="/upload-planeacion" 
            element={<ProtectedRoute><CargarDatosPlaneacion /></ProtectedRoute>}
          />
        </Routes>
      </Box>
    </Router>
  );
}

export default App;
