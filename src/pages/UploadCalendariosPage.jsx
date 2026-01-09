import React, { useState } from 'react';
import {
    Container, Typography, Box, TextField, Button, Paper, Alert, 
    Select, MenuItem, FormControl, InputLabel, Grid, Divider
} from '@mui/material';
import { motion } from 'framer-motion';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { DeleteForever } from '@mui/icons-material';
import CalendariosUploader from '../components/CalendariosUploader';

const sucursales = [
    "TECNOMOVIL_NORORIENTE",
    "TECNOMOVIL_BOGOTA",
    "TECNOMOVIL_SABANA",
    "TECNORIENTE_TUNJA",
    "TECNORIENTE_DUITAM"
];

const MetaManager = ({ uploaderKey }) => {
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
    const [uploaderKey, setUploaderKey] = useState(0);
    const [isDeleting, setIsDeleting] = useState({ impl: false, meta: false });
    const [deleteMessage, setDeleteMessage] = useState({ type: '', text: '' });
    const functions = getFunctions();

    const handleDeleteCollection = async (collectionName) => {
        const prettyName = collectionName.replace(/_/g, ' ');
        if (!window.confirm(`¿Estás seguro de que quieres borrar TODOS los registros de "${prettyName}"? Esta acción no se puede deshacer y puede tardar varios minutos.`)) return;

        const deletingKey = collectionName === 'Implementacion_Calendarios' ? 'impl' : 'meta';
        setIsDeleting(prev => ({...prev, [deletingKey]: true}));
        setDeleteMessage({ type: 'info', text: `Iniciando borrado de "${prettyName}"...` });

        try {
            const deleteCollection = httpsCallable(functions, 'deleteAllDocumentsInCollection');
            await deleteCollection({ collectionPath: collectionName });

            setDeleteMessage({ type: 'success', text: `¡Éxito! Se ha iniciado el borrado de "${prettyName}".` });
            setUploaderKey(prev => prev + 1); // Force re-render of children
        } catch (err) {
            setDeleteMessage({ type: 'error', text: err.message || `Ocurrió un error al invocar la función de borrado para "${prettyName}".` });
        } finally {
            setIsDeleting(prev => ({...prev, [deletingKey]: false}));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Container maxWidth="xl">
                <Typography variant="h4" component="h1" sx={{ mb: 4, mt: 2, fontWeight: 'bold', color: 'primary.main', textAlign: 'center' }}>
                    Carga de Datos de Calendarios
                </Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                        <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: 20 }}>
                            <Typography variant="h6" gutterBottom>Acciones</Typography>
                            {deleteMessage.text && <Alert severity={deleteMessage.type} sx={{mb: 2}}>{deleteMessage.text}</Alert>}
                            
                            <Typography variant="body1" sx={{fontWeight: 'bold'}}>Implementaciones</Typography>
                            <Button fullWidth variant="contained" color="error" size="small" onClick={() => handleDeleteCollection('Implementacion_Calendarios')} sx={{ mt: 1 }} disabled={isDeleting.impl} startIcon={<DeleteForever />}>
                                {isDeleting.impl ? 'Borrando...' : 'Borrar Implementaciones'}
                            </Button>

                            <Divider sx={{my: 2}} />

                            <Typography variant="body1" sx={{fontWeight: 'bold'}}>Metas</Typography>
                            <Button fullWidth variant="contained" color="error" size="small" onClick={() => handleDeleteCollection('MetasCalendarios')} sx={{ mt: 1 }} disabled={isDeleting.meta} startIcon={<DeleteForever />}>
                                {isDeleting.meta ? 'Borrando...' : 'Borrar Metas'}
                            </Button>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={9}>
                        <MetaManager key={`meta-${uploaderKey}`} />
                        <CalendariosUploader key={`uploader-${uploaderKey}`} />
                    </Grid>
                </Grid>
            </Container>
        </motion.div>
    );
};

export default UploadCalendariosPage;
