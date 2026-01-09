import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext'; // Importamos el AuthProvider

// --- TEMA AZUL Y BLANCO PROFESIONAL ---
const lightBlueTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976D2', // Azul principal, fuerte y profesional
    },
    secondary: {
      main: '#03A9F4', // Azul cielo para acentos
    },
    background: {
      default: '#F0F2F5', // Un fondo gris azulado muy claro
      paper: '#FFFFFF',   // Las tarjetas y superficies serán blancas puras
    },
    text: {
      primary: '#212121', // Texto oscuro para alta legibilidad
      secondary: '#757575',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={lightBlueTheme}>
      <CssBaseline /> {/* Normaliza y aplica el nuevo fondo */}
      <AuthProvider>  {/* Envolvemos la App con el proveedor */}
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
