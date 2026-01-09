import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import readXlsxFile from 'read-excel-file';
import { collection, writeBatch, doc, getFirestore } from 'firebase/firestore';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  LinearProgress, 
  Alert, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText 
} from '@mui/material';
import { UploadFile, CheckCircle } from '@mui/icons-material';

const DataUploader = ({ collectionName, onBeforeUpload }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const db = getFirestore();

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length) {
      setFile(acceptedFiles[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
  });

  const handleFileUpload = async () => {
    if (!file) {
      setError('Por favor, selecciona un archivo primero.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);

    try {
      const rows = await readXlsxFile(file);
      const headers = rows[0].map(header => header.trim());
      const initialData = rows.slice(1).map(row => {
        let rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index];
        });
        return rowData;
      });

      if (initialData.length === 0) {
        setError('El archivo está vacío o no tiene el formato correcto.');
        setUploading(false);
        return;
      }

      // Apply the pre-upload filter logic if provided
      const dataToUpload = onBeforeUpload ? await onBeforeUpload(initialData) : initialData;

      const originalCount = initialData.length;
      const finalCount = dataToUpload.length;

      if (finalCount === 0) {
        setError('Después de aplicar los filtros, no quedaron registros para subir.');
        setUploading(false);
        return;
      }

      // Upload data in batches
      const batchSize = 400;
      for (let i = 0; i < finalCount; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = dataToUpload.slice(i, i + batchSize);
        
        chunk.forEach(item => {
          const docRef = doc(collection(db, collectionName));
          batch.set(docRef, item);
        });

        await batch.commit();
        setProgress(((i + chunk.length) / finalCount) * 100);
      }
      
      let successMessage = `¡Éxito! Se cargaron ${finalCount} registros en "${collectionName}".`;
      if (originalCount > finalCount) {
        successMessage += ` Se omitieron ${originalCount - finalCount} registros que no pasaron el filtro.`;
      }

      setSuccess(successMessage);
      setFile(null); // Clear the file after successful upload
    } catch (err) {
      console.error('Error processing or uploading file:', err);
      setError('Hubo un error al procesar o subir el archivo. Revisa la consola para más detalles.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
       <Paper
        {...getRootProps()}
        elevation={isDragActive ? 5 : 2}
        sx={{
          p: 4,
          textAlign: 'center',
          border: isDragActive ? '2px dashed #42a5f5' : '2px dashed grey',
          backgroundColor: isDragActive ? '#e3f2fd' : '#fafafa',
          cursor: 'pointer',
          transition: 'border .24s ease-in-out, background-color .24s ease-in-out',
          mb: 2,
        }}
      >
        <input {...getInputProps()} />
        <UploadFile sx={{ fontSize: 40, color: 'grey.700' }} />
        {isDragActive ? (
          <Typography>Suelta el archivo aquí...</Typography>
        ) : (
          <Typography>Arrastra y suelta un archivo, o haz clic para seleccionar.</Typography>
        )}
      </Paper>

      {file && (
        <List dense>
          <ListItem>
            <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
            <ListItemText primary={`Archivo seleccionado: ${file.name}`} />
          </ListItem>
        </List>
      )}

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

      {uploading && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="text.secondary" align="center">{`Cargando... ${Math.round(progress)}%`}</Typography>
        </Box>
      )}

      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleFileUpload}
        disabled={!file || uploading}
      >
        {uploading ? 'Cargando...' : 'Subir Datos'}
      </Button>
    </Box>
  );
};

export default DataUploader;
