import React, { useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Container, Typography, Alert, Paper, Grid, List, ListItem, ListItemIcon, 
  ListItemText, Select, MenuItem, FormControl, InputLabel, TextField, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Tooltip, IconButton, LinearProgress, AlertTitle
} from '@mui/material';
import { getFirestore, collection, writeBatch, doc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useDropzone } from 'react-dropzone';
import readXlsxFile from 'read-excel-file';
import Papa from 'papaparse';
import {
  UploadFile, CheckCircle, AddCircleOutline, RemoveCircleOutline, DeleteForever
} from '@mui/icons-material';

const PREVIEW_ROWS = 100; // Número de filas a previsualizar

const CargarDatosPlaneacion = ({ user }) => {
  // --- State --- 
  const [file, setFile] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [fileRows, setFileRows] = useState([]);
  const [filters, setFilters] = useState([{ column: '', value: '' }]);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState({ type: '', text: '' });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const db = getFirestore();
  const functions = getFunctions();
  const collectionName = "UploadPlaneacion";
  const secondCollectionName = "Planeacion"; // Colección adicional a borrar

  // --- Core Functions --- 

  const resetState = () => {
    setFile(null); setIsProcessingFile(false); setFileHeaders([]); setFileRows([]);
    setUploadError(null); setUploadSuccess(null); 
    setFilters([{ column: '', value: '' }]);
  };

  const handleDeleteCollections = async () => {
    const collectionsToDelete = [collectionName, secondCollectionName];
    if (!window.confirm(`¿Estás seguro de que quieres borrar TODOS los registros de "${collectionsToDelete.join(' y ')}"? Esta acción es irreversible y puede tardar varios minutos.`)) return;

    setIsDeleting(true);
    setDeleteMessage({ type: '', text: '' });

    try {
        const deleteCollection = httpsCallable(functions, 'deleteAllDocumentsInCollection');
        for (const collName of collectionsToDelete) {
            await deleteCollection({ collectionPath: collName });
        }

        setDeleteMessage({ type: 'success', text: `¡Éxito! Se ha iniciado el borrado de las colecciones "${collectionsToDelete.join(' y ')}".` });
        resetState();
    } catch (err) {
        setDeleteMessage({ type: 'error', text: err.message || `Ocurrió un error al invocar la función de borrado.` });
    } finally {
        setIsDeleting(false);
    }
  };

  const parseFile = (file) => new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') Papa.parse(file, { header: false, skipEmptyLines: true, complete: res => resolve(res.data), error: err => reject(err) });
    else if (['xlsx', 'xls'].includes(ext)) readXlsxFile(file).then(resolve).catch(reject);
    else reject(new Error('Tipo de archivo no soportado: solo .xlsx, .xls, .csv'));
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    resetState();
    const currentFile = acceptedFiles[0];
    setFile(currentFile);
    setIsProcessingFile(true);
    try {
      const rows = await parseFile(currentFile);
      if (!rows || rows.length < 1) throw new Error("El archivo está vacío o es inválido.");
      const headers = rows[0].map(h => String(h || '').trim());
      setFileHeaders(headers);
      setFileRows(rows.slice(1));
    } catch (err) {
      setUploadError(err.message || 'Error al procesar el archivo.');
    } finally {
      setIsProcessingFile(false);
    }
  }, []);

  // --- Memoized Calculations --- 

  const filteredRows = useMemo(() => fileRows.filter(row => {
    return filters.every(filter => {
      if (!filter.column || !filter.value) return true;
      const colIndex = fileHeaders.indexOf(filter.column);
      if (colIndex === -1) return true;
      const cellValue = String(row[colIndex] || '').toLowerCase();
      return cellValue.includes(filter.value.toLowerCase());
    });
  }), [fileRows, filters, fileHeaders]);

  const handleUpload = async () => {
    setUploading(true); setUploadError(null); setUploadSuccess(null); setUploadProgress(0);

    const dataToUpload = filteredRows.map(row => {
      let obj = {};
      fileHeaders.forEach((header, i) => { obj[header] = row[i]; });
      return obj;
    });

    if (dataToUpload.length === 0) {
      setUploadError("No hay registros que cumplan con los filtros para cargar.");
      setUploading(false);
      return;
    }

    try {
      const batchSize = 100; // Keep this small for the client-side upload
      for (let i = 0; i < dataToUpload.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = dataToUpload.slice(i, i + batchSize);
        chunk.forEach(item => {
          const docRef = doc(collection(db, collectionName));
          batch.set(docRef, item);
        });
        await batch.commit();
        setUploadProgress(((i + chunk.length) / dataToUpload.length) * 100);
      }
      setUploadSuccess(`¡Éxito! Se cargaron ${dataToUpload.length} registros a la colección de Planeación.`);
      resetState(); 
    } catch (err) {
      setUploadError(err.message || "Ocurrió un error al cargar los datos.");
    } finally {
      setUploading(false);
    }
  };

  // --- Render-related --- 

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] } });
  const handleFilterChange = (index, field, value) => setFilters(filters.map((f, i) => i === index ? { ...f, [field]: value } : f));
  const addFilter = () => setFilters([...filters, { column: '', value: '' }]);
  const removeFilter = (index) => setFilters(filters.filter((_, i) => i !== index));

  // --- JSX --- 

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Typography variant="h4" gutterBottom align="center">Carga de Datos de Planeación</Typography>
      <Grid container spacing={2}>
        
        {/* Columna Izquierda */}
        <Grid item xs={12} md={3}>
          <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>1. Cargar Archivo</Typography>
            {deleteMessage.text && <Alert severity={deleteMessage.type} sx={{mb: 2}}>{deleteMessage.text}</Alert>}
            
            {!file ? (
              <Paper {...getRootProps()} sx={{ p: 4, textAlign: 'center', border: '2px dashed grey', cursor: 'pointer', backgroundColor: isDragActive ? '#e3f2fd' : 'transparent' }}>
                <input {...getInputProps()} />
                <UploadFile sx={{ fontSize: 40 }} color="action"/>
                <Typography variant="body1">{isDragActive ? 'Suelta el archivo' : 'Arrastra o haz clic para subir'}</Typography>
                <Typography variant="caption">Soportado: .xlsx, .xls, .csv</Typography>
              </Paper>
            ) : (
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                  <ListItemText primary={file.name} secondary={`${fileRows.length} registros encontrados`} />
                </ListItem>
              </List>
            )}
            {file && <Button fullWidth variant="outlined" color="secondary" size="small" onClick={resetState} sx={{mt: 1}}>Limpiar Selección</Button>}
            <Tooltip title={!user ? "Debes iniciar sesión para borrar datos" : ""}>
              <span>
                <Button fullWidth variant="contained" color="error" size="small" onClick={handleDeleteCollections} sx={{ mt: 1 }} disabled={isDeleting || !user} startIcon={<DeleteForever />}>
                  {isDeleting ? 'Borrando...' : 'Borrar Cargas Anteriores'}
                </Button>
              </span>
            </Tooltip>
          </Paper>
        </Grid>

        {/* Columna Derecha */}
        <Grid item xs={12} md={9}>
          <Paper elevation={3} sx={{ p: 2, width: '100%' }}>
            <Typography variant="h6">2. Filtrar Datos (Opcional)</Typography>
            <Box sx={{ my: 2 }}>
              {filters.map((filter, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 180 }} disabled={!file}>
                    <InputLabel>Columna</InputLabel>
                    <Select value={filter.column} label="Columna" onChange={e => handleFilterChange(index, 'column', e.target.value)}>{fileHeaders.map(h => <MenuItem key={`filter-col-${h}`} value={h}>{h}</MenuItem>)}</Select>
                  </FormControl>
                  <TextField size="small" label="Valor a buscar" value={filter.value} onChange={e => handleFilterChange(index, 'value', e.target.value)} sx={{flexGrow: 1}} disabled={!file || !filter.column}/>
                  <IconButton size="small" onClick={() => removeFilter(index)}><RemoveCircleOutline /></IconButton>
                </Box>
              ))}
              <Button startIcon={<AddCircleOutline />} onClick={addFilter} disabled={!file}>Añadir Filtro</Button>
            </Box>
            
            <Typography variant="h6" mt={2}>3. Previsualizar y Cargar</Typography>
            <Alert severity="info" sx={{my: 1}}>
              Mostrando {Math.min(filteredRows.length, PREVIEW_ROWS)} de {filteredRows.length} filas que coinciden con los filtros. <br/>
              Se cargarán <strong>{filteredRows.length} registros</strong> a Firebase.
            </Alert>
            
            {uploadError && <Alert severity="error" sx={{ my: 1, whiteSpace: 'pre-wrap' }}>{uploadError}</Alert>}
            {uploadSuccess && <Alert severity="success" sx={{ my: 1 }}>{uploadSuccess}</Alert>}
            {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{my: 1}}/>}
            
            <Button variant="contained" size="large" fullWidth onClick={handleUpload} disabled={!file || uploading || filteredRows.length === 0}>
              {uploading ? `Cargando... ${Math.round(uploadProgress)}%` : `Iniciar Carga de ${filteredRows.length} Registros`}
            </Button>

            <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 500px)', mt: 2 }}>
              <Table stickyHeader size="small">
                <TableHead><TableRow>{fileHeaders.map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {filteredRows.slice(0, PREVIEW_ROWS).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
             {file && filteredRows.length === 0 && <Typography sx={{textAlign: 'center', p: 4}}>No hay datos para mostrar con los filtros actuales.</Typography>}
             </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CargarDatosPlaneacion;
