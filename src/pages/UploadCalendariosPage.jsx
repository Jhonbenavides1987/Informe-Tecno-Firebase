import React, { useState } from 'react';
import { 
    Container, Typography, Box, TextField, Button, Paper, Alert, 
    Select, MenuItem, FormControl, InputLabel 
} from '@mui/material';
import { motion } from 'framer-motion';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import CalendariosUploader from '../components/CalendariosUploader'; // Importamos el nuevo componente

const sucursales = [
    "TECNOMOVIL_NORORIENTE",
    "TECNOMOVIL_BOGOTA",
    "TECNOMOVIL_SABANA",
    "TECNORIENTE_TUNJA",
    "TECNORIENTE_DUITAM"
];

const MetaManager = () => {
    const [sucursal, setSucursal] = useState('');
    const [meta, setMeta] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ show: false, message: '', severity: 'success' });

    const handleSaveMeta = async () => {
        if (!sucursal || !meta || isNaN(parseInt(meta, 10))) {
            setFeedback({ show: true, message: 'Por favor, selecciona una sucursal y define una meta numérica válida.', severity: 'error' });
            return;
        }

        setLoading(true);
        setFeedback({ show: false, message: '' });

        try {
            const db = getFirestore();
            const metaRef = doc(db, 'MetasCalendarios', sucursal);
            await setDoc(metaRef, { meta: parseInt(meta, 10) }, { merge: true });
            
            setFeedback({ show: true, message: `Meta para la sucursal ${sucursal} guardada con éxito.`, severity: 'success' });
            setSucursal('');
            setMeta('');

        } catch (error) {
            console.error("Error al guardar la meta:", error);
            setFeedback({ show: true, message: 'Hubo un error al guardar la meta. Revisa la consola para más detalles.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
            <Typography variant="h6" gutterBottom>Gestionar Meta por Sucursal</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <FormControl fullWidth>
                    <InputLabel id="sucursal-select-label">Sucursal</InputLabel>
                    <Select
                        labelId="sucursal-select-label"
                        value={sucursal}
                        label="Sucursal"
                        onChange={(e) => setSucursal(e.target.value)}
                    >
                        {sucursales.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                <TextField
                    label="Meta Numérica"
                    type="number"
                    value={meta}
                    onChange={(e) => setMeta(e.target.value)}
                    fullWidth
                />
            </Box>
            <Button variant="contained" onClick={handleSaveMeta} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Meta'}
            </Button>
            {feedback.show && <Alert severity={feedback.severity} sx={{ mt: 2 }}>{feedback.message}</Alert>}
        </Paper>
    );
};

const UploadCalendariosPage = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Container maxWidth="lg">
                <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main' }}>
                    Carga de Datos de Calendarios
                </Typography>
                
                <MetaManager />
                
                {/* Reemplazamos el DataUploader por el nuevo CalendariosUploader */}
                <CalendariosUploader />

            </Container>
        </motion.div>
    );
};

export default UploadCalendariosPage;
