import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Modal, Box, Typography, TextField, Button, Backdrop, Fade, Alert, CircularProgress
} from '@mui/material';

// Estilos para el modal (sin cambios)
const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

// El componente del Modal ahora pide Email y Contraseña
const LoginPrompt = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);
        
        setLoading(false);
        if (!result.success) {
            setError(result.error); // Mostramos el error devuelto por el AuthContext
        }
        // Si el login es exitoso, el contexto cambiará y el ProtectedRoute renderizará los hijos.
    };

    return (
        <Modal
            open={true}
            closeAfterTransition
            slots={{ backdrop: Backdrop }}
            slotProps={{
                backdrop: {
                    timeout: 500,
                },
            }}
            aria-labelledby="login-prompt-title"
        >
            <Fade in={true}>
                <Box sx={style} component="form" onSubmit={handleLogin}>
                    <Typography id="login-prompt-title" variant="h6" component="h2">
                        Acceso Restringido
                    </Typography>
                    <Typography variant="body2">
                        Inicia sesión para continuar.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        variant="outlined"
                        autoFocus
                    />
                    <TextField
                        fullWidth
                        label="Contraseña"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        variant="outlined"
                    />
                    {error && <Alert severity="error">{error}</Alert>}
                    <Button type="submit" variant="contained" fullWidth disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Iniciar Sesión'}
                    </Button>
                </Box>
            </Fade>
        </Modal>
    );
}

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // Si el usuario está autenticado (según el contexto de Firebase), muestra el contenido.
  if (isAuthenticated) {
    return children;
  }

  // Si no, muestra el pop-up de inicio de sesión.
  return <LoginPrompt />;
};

export default ProtectedRoute;
