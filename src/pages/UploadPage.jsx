import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Button, Container, Typography, Alert, Paper, Grid, List, ListItem, ListItemIcon, 
  ListItemText, Select, MenuItem, FormControl, InputLabel, TextField, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Tooltip, IconButton, LinearProgress, Divider, AlertTitle
} from '@mui/material';
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useDropzone } from 'react-dropzone';
import readXlsxFile from 'read-excel-file';
import Papa from 'papaparse';
import { UploadFile, CheckCircle, Warning, AddCircleOutline, RemoveCircleOutline, DeleteForever } from '@mui/icons-material';

import DataUploader from '../components/DataUploader';

const PREVIEW_ROWS = 100;

// El componente ahora recibe el prop `user`
const UploadPage = ({ user }) => {
  // State
  const [uploaderKey, setUploaderKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState({base: false, impl: false});
  const [deleteMessage, setDeleteMessage] = useState({type: '', text: ''});
  const [implementationFile, setImplementationFile] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [fileRows, setFileRows] = useState([]);
  const [selectedPdvIdColumn, setSelectedPdvIdColumn] = useState('');
  const [masterPdvIds, setMasterPdvIds] = useState(new Set());
  const [validationStatus, setValidationStatus] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [filters, setFilters] = useState([{ column: '', value: '' }]);

  const db = getFirestore();
  const functions = getFunctions();
  
  const handleDeleteCollection = async (collectionName) => {
    const prettyName = collectionName.replace(/_/g, ' ');
    if (!window.confirm(`¿Estás seguro de que quieres borrar TODOS los registros de la colección \"${prettyName}\"? Esta acción no se puede deshacer.`)) return;

    const deletingKey = collectionName === 'Base Pospago' ? 'base' : 'impl';
    setIsDeleting(prev => ({...prev, [deletingKey]: true}));
    setDeleteMessage({type: 'info', text: `Iniciando borrado seguro de \"${prettyName}\"...`});

    try {
        const deleteCollection = httpsCallable(functions, 'deleteAllDocumentsInCollection');
        const result = await deleteCollection({ collectionPath: collectionName });

        setDeleteMessage({type: 'success', text: result.data.message || `¡Éxito! Se ha completado el borrado de \"${prettyName}\".`});
        if (collectionName === 'Implementacion Pospago') resetImplementationState();
        if (collectionName === 'Base Pospago') setMasterPdvIds(new Set());
        setUploaderKey(prev => prev + 1); // Refresca componentes dependientes
    } catch (err) {
        console.error("Error en handleDeleteCollection:", err);
        const errorMessage = err.message || `Ocurrió un error al borrar \"${prettyName}\".`;
        setDeleteMessage({type: 'error', text: `Error: ${errorMessage}`});
    } finally {
        setIsDeleting(prev => ({...prev, [deletingKey]: false}));
    }
  };

  // El resto de la lógica del componente permanece igual...
  const fetchMasterPdvIds = async () => {
    try {
      const pospagoSnapshot = await getDocs(collection(db, 'Base Pospago'));
      const ids = new Set(pospagoSnapshot.docs.map(d => String(d.data().IDPDV).trim()));
      setMasterPdvIds(ids);
    } catch (error) {
      setUploadError("Error al cargar la base maestra de PDV.");
    }
  };

  useEffect(() => { fetchMasterPdvIds(); }, [uploaderKey]);

  const resetImplementationState = () => {
    setImplementationFile(null); setIsProcessingFile(false); setFileHeaders([]); setFileRows([]);
    setSelectedPdvIdColumn(''); setUploadError(null); setUploadSuccess(null); 
    setValidationStatus({}); setFilters([{ column: '', value: '' }]);
  };

  const parseFile = (file) => new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') Papa.parse(file, { header: false, skipEmptyLines: true, complete: res => resolve(res.data), error: err => reject(err) });
    else if (['xlsx', 'xls'].includes(ext)) readXlsxFile(file).then(resolve).catch(reject);
    else reject(new Error('Tipo de archivo no soportado.'));
  });

  const onDropImplementation = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    resetImplementationState();
    const file = acceptedFiles[0];
    setImplementationFile(file);
    setIsProcessingFile(true);
    try {
      const rows = await parseFile(file);
      if (!rows || rows.length < 1) throw new Error("El archivo está vacío o es inválido.");
      const headers = rows[0].map(h => String(h || '').trim());
      setFileHeaders(headers);
      setFileRows(rows);
    } catch (err) {
      setUploadError(err.message || 'Error al procesar el archivo.');
    } finally { setIsProcessingFile(false); }
  }, []);

  useEffect(() => {
    if (selectedPdvIdColumn && fileRows.length > 0 && masterPdvIds.size > 0) {
      const pdvIndex = fileHeaders.indexOf(selectedPdvIdColumn);
      if (pdvIndex === -1) return;
      const newStatus = {};
      for (let i = 1; i < fileRows.length; i++) {
        const row = fileRows[i];
        const pdvId = String(row[pdvIndex] || '').trim();
        newStatus[i] = masterPdvIds.has(pdvId);
      }
      setValidationStatus(newStatus);
    }
  }, [selectedPdvIdColumn, fileRows, fileHeaders, masterPdvIds]);

  const filteredRows = fileRows.slice(1).filter(row => {
      return filters.every(filter => {
          if (!filter.column || !filter.value) return true;
          const colIndex = fileHeaders.indexOf(filter.column);
          if (colIndex === -1) return true;
          const cellValue = String(row[colIndex] || '').toLowerCase();
          return cellValue.includes(filter.value.toLowerCase());
      });
  });

  const handleUpload = async () => {
    setUploading(true); setUploadError(null); setUploadSuccess(null); setUploadProgress(0);
    const rowsToUpload = filteredRows.filter(row => validationStatus[fileRows.indexOf(row) + 1]);
    const dataToUpload = rowsToUpload.map(row => {
        let obj = {};
        fileHeaders.forEach((header, i) => { obj[header] = row[i]; });
        return obj;
    });

    if (dataToUpload.length === 0) {
        setUploadError("No hay filas válidas que cumplan los filtros para cargar.");
        setUploading(false);
        return;
    }

    try {
      const batchSize = 400;
      for (let i = 0; i < dataToUpload.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = dataToUpload.slice(i, i + batchSize);
          chunk.forEach(item => {
              const docRef = doc(collection(db, "Implementacion Pospago"));
              batch.set(docRef, item);
          });
          await batch.commit();
          setUploadProgress(((i + chunk.length) / dataToUpload.length) * 100);
      }
      setUploadSuccess(`¡Éxito! Se cargaron ${dataToUpload.length} registros.`);
      resetImplementationState();
    } catch (err) {
        setUploadError(err.message || "Ocurrió un error al cargar los datos.");
    } finally { setUploading(false); }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onDropImplementation, accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] } });
  const handleFilterChange = (index, field, value) => setFilters(filters.map((f, i) => i === index ? { ...f, [field]: value } : f));
  const addFilter = () => setFilters([...filters, { column: '', value: '' }]);
  const removeFilter = (index) => setFilters(filters.filter((_, i) => i !== index));
  const validFilteredRowsCount = filteredRows.filter(row => validationStatus[fileRows.indexOf(row) + 1]).length;

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Typography variant="h4" gutterBottom align="center">Carga y Análisis de Datos (Pospago)</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>1. Cargar Archivos</Typography>
            {deleteMessage.text && <Alert severity={deleteMessage.type} sx={{mb: 2}}>{deleteMessage.text}</Alert>}
            
            <Typography variant="body1" sx={{fontWeight: 'bold'}}>Base Maestra (Pospago)</Typography>
            <DataUploader key={`uploader-pospago-${uploaderKey}`} collectionName="Base Pospago" onUploadSuccess={fetchMasterPdvIds}/>
            
            {/* --- BOTÓN DE BORRADO POSPAGO --- */}
            <Tooltip title={!user ? "Debes iniciar sesión para borrar datos" : ""}>
              <span> {/* El span es necesario para que el Tooltip funcione en un botón deshabilitado */}
                <Button 
                  fullWidth 
                  variant="contained" 
                  color="error" 
                  size="small" 
                  onClick={() => handleDeleteCollection('Base Pospago')} 
                  sx={{ mt: 1 }} 
                  disabled={isDeleting.base || !user} // Deshabilitado si no hay usuario
                  startIcon={<DeleteForever />}
                >
                  {isDeleting.base ? 'Borrando...' : 'Borrar Base Pospago'}
                </Button>
              </span>
            </Tooltip>

            <Divider sx={{my: 2}} />

            <Typography variant="body1" sx={{fontWeight: 'bold'}}>Archivo de Implementaciones</Typography>
            {!implementationFile ? (
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
                  <ListItemText primary={implementationFile.name} secondary={`${fileRows.length > 0 ? fileRows.length - 1 : 0} registros encontrados`} />
                </ListItem>
              </List>
            )}
            {implementationFile && <Button fullWidth variant="outlined" color="secondary" size="small" onClick={resetImplementationState} sx={{mt: 1}}>Limpiar Selección</Button>}
            
            {/* --- BOTÓN DE BORRADO IMPLEMENTACIONES --- */}
            <Tooltip title={!user ? "Debes iniciar sesión para borrar datos" : ""}>
              <span>
                <Button 
                  fullWidth 
                  variant="contained" 
                  color="error" 
                  size="small" 
                  onClick={() => handleDeleteCollection('Implementacion Pospago')} 
                  sx={{ mt: 1 }} 
                  disabled={isDeleting.impl || !user} // Deshabilitado si no hay usuario
                  startIcon={<DeleteForever />}
                >
                  {isDeleting.impl ? 'Borrando...' : 'Borrar Implementaciones Anteriores'}
                </Button>
              </span>
            </Tooltip>

          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          {/* El resto de la UI no necesita cambios... */}
          <Paper elevation={3} sx={{ p: 2, width: '100%' }}>
            <Alert severity="warning" sx={{mb: 2}}>
              <AlertTitle>Estado de la Validación</AlertTitle>
              Se han cargado <strong>{masterPdvIds.size}</strong> IDs únicos desde la <strong>Base Pospago</strong> en memoria para la validación.
              Si este número es 0, por favor, asegúrate de haber subido el archivo correcto de 'Base Pospago'.
            </Alert>

            <Typography variant="h6">2. Configurar y Previsualizar</Typography>
            {fileHeaders.length > 0 && (
              <FormControl fullWidth sx={{ my: 2 }} size="small">
                <InputLabel id="pdv-id-label">Columna de ID de PDV (para validación)</InputLabel>
                <Select labelId="pdv-id-label" value={selectedPdvIdColumn} label="Columna de ID de PDV (para validación)" onChange={e => setSelectedPdvIdColumn(e.target.value)}>
                  {fileHeaders.map(h => <MenuItem key={`pdv-${h}`} value={h}>{h}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <Typography variant="h6" mt={2}>3. Filtrar y Cargar</Typography>
            <Box sx={{ my: 2 }}>
              {filters.map((filter, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Columna</InputLabel>
                    <Select value={filter.column} label="Columna" onChange={e => handleFilterChange(index, 'column', e.target.value)}>{fileHeaders.map(h => <MenuItem key={`filter-col-${h}`} value={h}>{h}</MenuItem>)}</Select>
                  </FormControl>
                  <TextField size="small" label="Valor a buscar" value={filter.value} onChange={e => handleFilterChange(index, 'value', e.target.value)} sx={{flexGrow: 1}}/>
                  <IconButton size="small" onClick={() => removeFilter(index)}><RemoveCircleOutline /></IconButton>
                </Box>
              ))}
              <Button startIcon={<AddCircleOutline />} onClick={addFilter} disabled={!implementationFile}>Añadir Filtro</Button>
            </Box>
            
            <Alert severity="info" sx={{my: 1}}>
              Mostrando {Math.min(filteredRows.length, PREVIEW_ROWS)} de {filteredRows.length} filas que coinciden con los filtros. 
              De estas, <strong>{validFilteredRowsCount} filas son válidas</strong> (tienen ✅) y se cargarán.
            </Alert>
            
            {uploadError && <Alert severity="error" sx={{ my: 1, whiteSpace: 'pre-wrap' }}>{uploadError}</Alert>}
            {uploadSuccess && <Alert severity="success" sx={{ my: 1 }}>{uploadSuccess}</Alert>}
            {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{my: 1}}/>}
            
            <Button variant="contained" size="large" fullWidth onClick={handleUpload} disabled={!selectedPdvIdColumn || uploading || validFilteredRowsCount === 0}>
              {uploading ? `Cargando... ${Math.round(uploadProgress)}%` : `Iniciar Carga de ${validFilteredRowsCount} Registros Válidos`}
            </Button>

            <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 450px)', mt: 2 }}>
              <Table stickyHeader size="small">
                <TableHead><TableRow><TableCell sx={{position: 'sticky', left: 0, zIndex: 10, background: 'white'}}>Diagnóstico</TableCell>{fileHeaders.map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                  {filteredRows.slice(0, PREVIEW_ROWS).map((row, rowIndex) => {
                    const originalIndex = fileRows.indexOf(row) + 1;
                    const isValid = validationStatus[originalIndex];
                    const rowStyle = !selectedPdvIdColumn ? {} : (isValid ? { backgroundColor: 'rgba(200, 255, 200, 0.2)' } : { backgroundColor: 'rgba(255, 200, 200, 0.3)' });
                    return (
                      <TableRow key={originalIndex} sx={rowStyle}>
                        <TableCell sx={{position: 'sticky', left: 0, background: rowStyle.backgroundColor || 'white', zIndex: 10}}>
                          {selectedPdvIdColumn && (isValid ? <Tooltip title="ID encontrado en Base Maestra"><CheckCircle fontSize="small" color="success" /></Tooltip> : <Tooltip title="ID no encontrado en Base Maestra"><Warning fontSize="small" color="error" /></Tooltip>)}
                        </TableCell>
                        {row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UploadPage;
