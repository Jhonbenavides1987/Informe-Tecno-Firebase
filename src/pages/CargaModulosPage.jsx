import React from 'react';
import { Container, Typography, Box, Button, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';

const CargaModulosPage = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Container maxWidth="md">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Módulos de Carga de Datos
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Selecciona la sección a la que deseas subir información.
          </Typography>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6}>
            <Button component={NavLink} to="/upload-pospago" variant="contained" fullWidth size="large">Cargar Pospago</Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button component={NavLink} to="/upload-prepago" variant="contained" fullWidth size="large">Cargar Prepago</Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button component={NavLink} to="/upload-durable" variant="contained" fullWidth size="large">Cargar Durable</Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button component={NavLink} to="/upload-activacion" variant="contained" fullWidth size="large">Cargar Activación</Button>
          </Grid>
           <Grid item xs={12} sm={6}>
            <Button component={NavLink} to="/upload-aliados" variant="contained" fullWidth size="large">Cargar Aliados</Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button component={NavLink} to="/upload-calendarios" variant="contained" fullWidth size="large">Cargar Calendarios</Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button component={NavLink} to="/upload-porta-afiches" variant="contained" fullWidth size="large">Cargar Porta Afiches</Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button component={NavLink} to="/upload-planeacion" variant="contained" fullWidth size="large">Cargar Planeación</Button>
          </Grid>
        </Grid>
      </Container>
    </motion.div>
  );
};

export default CargaModulosPage;
