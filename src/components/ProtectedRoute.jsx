import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Modal, Box, Typography, TextField, Button, Backdrop, Fade, Alert
} from '@mui/material';

// Estilos para el modal
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

const PasswordPrompt = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        if (!login(password)) {
            setError('Contraseña incorrecta. Inténtalo de nuevo.');
        }
        // Si el login es exitoso, el contexto cambia y el ProtectedRoute renderizará los hijos.
    };

    return (
        <Modal
            open={true} // El modal siempre está abierto si se renderiza este componente
            closeAfterTransition
            slots={{ backdrop: Backdrop }}
            slotProps={{
                backdrop: {
                    timeout: 500,
                },
            }}
            aria-labelledby="password-prompt-title"
        >
            <Fade in={true}>
                <Box sx={style} component="form" onSubmit={handleLogin}>
                    <Typography id="password-prompt-title" variant="h6" component="h2">
                        Acceso Restringido
                    </Typography>
                    <Typography variant="body2">
                        Necesitas una contraseña para acceder a esta sección.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Contraseña"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        variant="outlined"
                        autoFocus
                    />
                    {error && <Alert severity="error">{error}</Alert>}
                    <Button type="submit" variant="contained" fullWidth>
                        Desbloquear
                    </Button>
                </Box>
            </Fade>
        </Modal>
    );
}

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return children;
  }

  return <PasswordPrompt />;
};

export default ProtectedRoute;
