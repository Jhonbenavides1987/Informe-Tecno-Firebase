import React, { useState, useEffect } from 'react';
import { 
    Container, 
    Typography, 
    Box, 
    Paper, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    CircularProgress, 
    Alert,
    Chip
} from '@mui/material';
import { motion } from 'framer-motion';
import { getFirestore, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const getStatusStyle = (value) => {
  if (value >= 94) return { backgroundColor: '#4caf50', color: 'white' };
  if (value >= 80) return { backgroundColor: '#ffc107', color: 'black' };
  return { backgroundColor: '#f44336', color: 'white' };
};

const CalendariosDataTable = () => {
    const [progressData, setProgressData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const db = getFirestore();
        const progressRef = collection(db, "ProgresoCalendarios");
        const q = query(progressRef, orderBy("BRANCH"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProgressData(data);
            setLoading(false);
        }, (err) => {
            console.error("Error al obtener datos de progreso: ", err);
            setError("No se pudieron cargar los datos. Por favor, revisa la consola.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    if (progressData.length === 0) {
        return <Alert severity="info">Aún no hay datos de progreso para mostrar.</Alert>;
    }

    return (
        <TableContainer component={Paper} elevation={3}>
            <Table>
                <TableHead>
                    <TableRow sx={{ '& > th': { fontWeight: 'bold', backgroundColor: 'primary.main', color: 'common.white', textTransform: 'uppercase' } }}>
                        <TableCell>Sucursal</TableCell>
                        <TableCell align="center">Meta</TableCell>
                        <TableCell align="center">Implementados</TableCell>
                        <TableCell align="center">Progreso</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {progressData.map((row) => (
                        <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                            <TableCell component="th" scope="row">{row.BRANCH}</TableCell>
                            <TableCell align="center">{row.meta}</TableCell>
                            <TableCell align="center">{row.conteo_implementado}</TableCell>
                            <TableCell align="center">
                                <Chip 
                                    label={`${(row.porcentaje || 0).toFixed(2)}%`}
                                    sx={getStatusStyle(row.porcentaje || 0)}
                                    size="small"
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

const DashboardCalendariosPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Container maxWidth="xl">
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Dashboard de Implementación de Calendarios
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
                    Visualización del progreso de implementación de calendarios por sucursal contra la meta establecida.
                </Typography>
                
                <CalendariosDataTable />

            </Container>
        </motion.div>
    );
};

export default DashboardCalendariosPage;
