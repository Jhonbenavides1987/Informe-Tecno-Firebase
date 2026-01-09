import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import readXlsxFile from 'read-excel-file';
import Papa from 'papaparse';
import { 
    Box, Button, Typography, Paper, Alert, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
    AlertTitle, LinearProgress
} from '@mui/material';
import { getFirestore, collection, writeBatch, doc, getDocs } from 'firebase/firestore';

const CalendariosUploader = () => {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [feedback, setFeedback] = useState({ show: false, message: '', severity: 'info' });

    const parseFile = (file) => new Promise((resolve, reject) => {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'csv') {
            Papa.parse(file, { header: false, skipEmptyLines: true, complete: res => resolve(res.data), error: err => reject(err) });
        } else if (['xlsx', 'xls'].includes(ext)) {
            readXlsxFile(file).then(resolve).catch(reject);
        } else {
            reject(new Error('Tipo de archivo no soportado. Por favor, use .xlsx, .xls o .csv.'));
        }
    });

    const resetState = () => {
        setFile(null); setIsProcessing(false); setHeaders([]); setRows([]); 
        setSearchTerm(''); setUploading(false); setUploadProgress(0); 
        setFeedback({ show: false, message: '' });
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;
        resetState();
        const droppedFile = acceptedFiles[0];
        setFile(droppedFile);
        setIsProcessing(true);
        setFeedback({ show: true, message: 'Procesando archivo... Esto puede tardar unos segundos.', severity: 'info' });

        try {
            const parsedRows = await parseFile(droppedFile);
            if (!parsedRows || parsedRows.length < 1) throw new Error("El archivo está vacío o es inválido.");
            
            const headerRow = parsedRows[0].map(h => String(h || '').trim());
            const dataRows = parsedRows.slice(1);

            setHeaders(headerRow);
            setRows(dataRows);
            setFeedback({ show: true, message: `Se encontraron ${dataRows.length} registros en el archivo.`, severity: 'success' });
        } catch (err) {
            setFeedback({ show: true, message: err.message || 'Error al procesar el archivo.', severity: 'error' });
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const uniqueRowsToUpload = useMemo(() => {
        const idColumn = 'ID_PDV';
        const pdvIndex = headers.indexOf(idColumn);
        
        if (pdvIndex === -1) {
            return rows.filter(row => Object.values(row).some(cell => String(cell).toLowerCase().includes(searchTerm.toLowerCase())));
        }

        const uniquePdvIds = new Set();
        const uniqueRowsResult = [];
        const dataToFilter = searchTerm ? rows.filter(row => Object.values(row).some(cell => String(cell).toLowerCase().includes(searchTerm.toLowerCase()))) : rows;

        for (const row of dataToFilter) {
            const pdvId = String(row[pdvIndex] || '').trim();
            if (pdvId && !uniquePdvIds.has(pdvId)) {
                uniquePdvIds.add(pdvId);
                uniqueRowsResult.push(row);
            }
        }
        return uniqueRowsResult;
    }, [rows, headers, searchTerm]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] } });

    const handleUpload = async () => {
        setUploading(true);
        setFeedback({ show: false, message: '' });
        setUploadProgress(0);

        const dataToUpload = uniqueRowsToUpload.map(row => {
            let obj = {};
            headers.forEach((header, i) => { obj[header] = row[i]; });
            return obj;
        });

        if (dataToUpload.length === 0) {
            setFeedback({ show: true, message: "No hay registros únicos para cargar.", severity: 'warning' });
            setUploading(false);
            return;
        }

        const db = getFirestore();
        try {
            const batchSize = 400;
            for (let i = 0; i < dataToUpload.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = dataToUpload.slice(i, i + batchSize);
                chunk.forEach(item => {
                    const docRef = doc(collection(db, "ImplementacionCalendarios"));
                    batch.set(docRef, item);
                });
                await batch.commit();
                setUploadProgress(((i + chunk.length) / dataToUpload.length) * 100);
            }
            setFeedback({ show: true, message: `¡Éxito! Se cargaron ${dataToUpload.length} registros únicos.`, severity: 'success' });
            resetState();
        } catch (err) {
            setFeedback({ show: true, message: err.message || "Ocurrió un error al cargar los datos.", severity: 'error' });
        } finally {
            setUploading(false);
        }
    };
    
    const handleDeleteAll = async () => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar TODOS los registros de implementación y progreso? Esta acción no se puede deshacer.')) {
            return;
        }
    
        setUploading(true);
        setFeedback({ show: true, message: 'Eliminando todos los registros...', severity: 'warning' });
    
        const db = getFirestore();
        
        const deleteCollection = async (collectionName) => {
            const collectionRef = collection(db, collectionName);
            const querySnapshot = await getDocs(collectionRef);
            if (querySnapshot.empty) {
                return 0;
            }
    
            const batchSize = 400;
            const batches = [];
            let currentBatch = writeBatch(db);
            let docsInBatch = 0;
    
            querySnapshot.forEach((doc) => {
                currentBatch.delete(doc.ref);
                docsInBatch++;
                if (docsInBatch === batchSize) {
                    batches.push(currentBatch.commit());
                    currentBatch = writeBatch(db);
                    docsInBatch = 0;
                }
            });
    
            if (docsInBatch > 0) {
                batches.push(currentBatch.commit());
            }
    
            await Promise.all(batches);
            return querySnapshot.size;
        };

        try {
            const [deletedImplementacion, deletedProgreso] = await Promise.all([
                deleteCollection('ImplementacionCalendarios'),
                deleteCollection('ProgresoCalendarios')
            ]);
            
            const totalDeleted = deletedImplementacion + deletedProgreso;

            if (totalDeleted === 0) {
                 setFeedback({ show: true, message: 'No había registros para eliminar en las colecciones.', severity: 'info' });
            } else {
                 setFeedback({ show: true, message: `¡Éxito! Se eliminaron ${deletedImplementacion} registros de implementación y ${deletedProgreso} de progreso.`, severity: 'success' });
            }
           
            resetState();
    
        } catch (err) {
            console.error("Error deleting documents: ", err);
            setFeedback({ show: true, message: err.message || 'Ocurrió un error al eliminar los datos.', severity: 'error' });
        } finally {
            setUploading(false);
        }
    };


    return (
        <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>Cargar Archivo de Implementación de Calendarios</Typography>
            
            {!file && (
                 <Button
                    variant="contained"
                    color="error"
                    onClick={handleDeleteAll}
                    disabled={isProcessing || uploading}
                    sx={{ mb: 2 }}
                >
                    Eliminar Todos los Registros
                </Button>
            )}
            
            {!file ? (
                <Box {...getRootProps()} sx={{ border: '2px dashed grey', p: 4, textAlign: 'center', cursor: 'pointer', backgroundColor: isDragActive ? '#f0f0f0' : 'transparent' }}>
                    <input {...getInputProps()} />
                    <Typography>{isDragActive ? 'Suelta el archivo aquí...' : 'Arrastra o haz clic para subir archivo (.xlsx, .csv)'}</Typography>
                </Box>
            ) : (
                 <Alert severity="success">Archivo <strong>{file.name}</strong> listo para procesar.</Alert>
            )}
            
            {isProcessing && <LinearProgress sx={{my: 2}} />}

            {feedback.show && <Alert severity={feedback.severity} sx={{ my: 2 }}>{feedback.message}</Alert>}
            
            {rows.length > 0 && (
                <Box>
                    <TextField
                        fullWidth
                        label="Filtrar registros..."
                        variant="outlined"
                        margin="normal"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Alert severity="info" sx={{my: 1}}>
                      <AlertTitle>Resumen de Carga</AlertTitle>
                       <Typography variant="body2">Se encontraron <strong>{rows.length}</strong> registros en el archivo.</Typography>
                       <Typography variant="body2">Después de filtrar y quitar duplicados por ID_PDV, se cargarán <strong>{uniqueRowsToUpload.length}</strong> registros únicos.</Typography>
                    </Alert>

                    {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{my: 1}}/>}
                    
                    <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
                        <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            onClick={handleUpload}
                            disabled={isProcessing || uploading || uniqueRowsToUpload.length === 0}
                        >
                            {uploading ? `Cargando... ${Math.round(uploadProgress)}%` : `Iniciar Carga de ${uniqueRowsToUpload.length} Registros Únicos`}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            size="large"
                            fullWidth
                            onClick={() => resetState()}
                            disabled={uploading}
                        >
                            Cancelar
                        </Button>
                    </Box>

                    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                        <Table stickyHeader size="small">
                            <TableHead><TableRow>{headers.map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                            <TableBody>
                                {uniqueRowsToUpload.slice(0, 100).map((row, rowIndex) => (
                                    <TableRow key={rowIndex}>
                                        {row.map((cell, cellIndex) => <TableCell key={cellIndex}>{String(cell)}</TableCell>)}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {uniqueRowsToUpload.length > 100 && <Typography align="center" sx={{mt: 1, fontStyle: 'italic'}}>Mostrando las primeras 100 de {uniqueRowsToUpload.length} filas a cargar.</Typography>}
                </Box>
            )}
        </Paper>
    );
};

export default CalendariosUploader;
