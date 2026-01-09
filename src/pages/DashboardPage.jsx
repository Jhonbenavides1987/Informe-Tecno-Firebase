import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Paper, Alert, TextField, ToggleButton, ToggleButtonGroup, 
  CircularProgress, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Chip, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { collection, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { firestore } from '../firebase';
import FilterControls from '../components/FilterControls';

// --- Helper Functions ---
const getStatusStyle = (value) => {
  if (value >= 94) return { backgroundColor: '#4caf50', color: 'white' };
  if (value >= 80) return { backgroundColor: '#ffc107', color: 'black' };
  return { backgroundColor: '#f44336', color: 'white' };
};

const aggregateData = (data, key) => {
  if (!key) return [];
  const grouped = data.reduce((acc, item) => {
    const groupName = item[key] || 'Sin Asignar';
    if (!acc[groupName]) {
      acc[groupName] = { total: 0, implementados: 0 };
    }
    acc[groupName].total++;
    if (item.implementado) {
      acc[groupName].implementados++;
    }
    return acc;
  }, {});

  return Object.entries(grouped).map(([name, values]) => ({
    name,
    ...values,
    percentage: values.total > 0 ? (values.implementados / values.total) * 100 : 0,
  })).sort((a, b) => a.name.localeCompare(b.name));
};

const tableHeaderStyle = {
  backgroundColor: '#e3f2fd',
  color: '#0d47a1',
  fontWeight: 'bold',
  textTransform: 'uppercase',
};

// --- Summary Table ---
const SummaryTable = ({ title, data }) => (
  <TableContainer component={Paper} sx={{ mb: 4 }} elevation={3}>
    <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>{title.toUpperCase()}</Typography>
    <Table stickyHeader size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={tableHeaderStyle}>{title}</TableCell>
          <TableCell sx={tableHeaderStyle} align="center">Puntos de Venta</TableCell>
          <TableCell sx={tableHeaderStyle} align="center">Implementados</TableCell>
          <TableCell sx={tableHeaderStyle} align="center">% Implementación</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.name} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
            <TableCell component="th" scope="row">{row.name}</TableCell>
            <TableCell align="center">{row.total}</TableCell>
            <TableCell align="center">{row.implementados}</TableCell>
            <TableCell align="center">
              <Chip label={`${row.percentage.toFixed(2)}%`} sx={getStatusStyle(row.percentage)} size="small"/>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

// --- Main Dashboard Page ---
const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [allPdv, setAllPdv] = useState([]);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ SUCURSAL: [], RUTA: [], CIRCUITO: [] });
  const [view, setView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, 'Base Pospago'), 
      (querySnapshot) => {
        const pdvList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllPdv(pdvList);
        setLoading(false);
      },
      (err) => {
        setError("Ocurrió un error al cargar los datos.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredPdv = useMemo(() => {
    return allPdv.filter(pdv => 
      (filters.SUCURSAL.length === 0 || filters.SUCURSAL.includes(pdv.SUCURSAL)) &&
      (filters.RUTA.length === 0 || filters.RUTA.includes(pdv.RUTA)) &&
      (filters.CIRCUITO.length === 0 || filters.CIRCUITO.includes(pdv.CIRCUITO))
    );
  }, [allPdv, filters]);

  const summaryData = useMemo(() => ({
    sucursal: aggregateData(filteredPdv, 'SUCURSAL'),
    ruta: aggregateData(filteredPdv, 'RUTA'),
    circuito: aggregateData(filteredPdv, 'CIRCUITO'),
  }), [filteredPdv]);

  const finalDetailedData = useMemo(() => {
    let data = filteredPdv;
    if (view === 'implemented') data = data.filter(pdv => pdv.implementado);
    if (view === 'unimplemented') data = data.filter(pdv => !pdv.implementado);
    
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      data = data.filter(item => 
        ['MESA', 'RUTA', 'CIRCUITO', 'IDPDV', 'NOMBRE_PUNTO'].some(key => 
          String(item[key] || '').toLowerCase().includes(lowercasedFilter)
        )
      );
    }
    return data.sort((a, b) => String(a.CIRCUITO || '').localeCompare(String(b.CIRCUITO || '')));
  }, [filteredPdv, view, searchTerm]);
  
  const mainMetrics = useMemo(() => {
      const total = filteredPdv.length;
      const implementados = filteredPdv.filter(pdv => pdv.implementado).length;
      const percentage = total > 0 ? (implementados / total) * 100 : 0;
      return { total, implementados, percentage };
  }, [filteredPdv]);

  const circuitColorMap = useMemo(() => {
    const uniqueCircuits = [...new Set(finalDetailedData.map(pdv => pdv.CIRCUITO || 'Sin Asignar'))];
    const colorMap = {};
    const colors = ['#ffffff', '#f5f5f5'];
    uniqueCircuits.forEach((circuit, index) => {
      colorMap[circuit] = colors[index % 2];
    });
    return colorMap;
  }, [finalDetailedData]);

  const handleExport = () => {
    const dataToExport = finalDetailedData.map(pdv => ({
      'MESA': pdv.MESA,
      'RUTA': pdv.RUTA,
      'CIRCUITO': pdv.CIRCUITO,
      'IDPDV': pdv.IDPDV,
      'NOMBRE PUNTO': pdv.NOMBRE_PUNTO,
      'ESTADO': pdv.implementado ? 'Implementado' : 'No Implementado'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Detalle Pdv Filtrado");
    XLSX.writeFile(workbook, "DetallePdvFiltrado.xlsx");
  };

  const getFilterData = (filterName) => {
      if (filterName === 'RUTA') return allPdv.filter(pdv => filters.SUCURSAL.length === 0 || filters.SUCURSAL.includes(pdv.SUCURSAL));
      if (filterName === 'CIRCUITO') return allPdv.filter(pdv => (filters.SUCURSAL.length === 0 || filters.SUCURSAL.includes(pdv.SUCURSAL)) && (filters.RUTA.length === 0 || filters.RUTA.includes(pdv.RUTA)));
      return allPdv;
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1400, margin: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>Dashboard de Implementación</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} justifyContent="center" sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}><Card sx={{ textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Puntos (filtrados)</Typography><Typography variant="h4">{mainMetrics.total.toLocaleString()}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={4}><Card sx={{ textAlign: 'center' }}><CardContent><Typography color="text.secondary">Implementados</Typography><Typography variant="h4" color="success.main">{mainMetrics.implementados.toLocaleString()}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} sm={4}><Card sx={{ textAlign: 'center' }}><CardContent><Typography color="text.secondary">Porcentaje</Typography><Typography variant="h4" color="primary.main">{`${mainMetrics.percentage.toFixed(2)}%`}</Typography></CardContent></Card></Grid>
      </Grid>

      <Accordion sx={{ mb: 4, boxShadow: '0 2px 4px -1px rgba(0,0,0,0.2)' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="filters-panel-content" id="filters-panel-header">
              <Typography variant="h6">Filtros</Typography>
          </AccordionSummary>
          <AccordionDetails>
              <Grid container spacing={2}>
                  <Grid item xs={12}>
                      <FilterControls
                          headers={['SUCURSAL', 'RUTA', 'CIRCUITO']}
                          filters={filters}
                          onFilterChange={handleFilterChange}
                          dataForOptions={{
                              SUCURSAL: allPdv,
                              RUTA: getFilterData('RUTA'),
                              CIRCUITO: getFilterData('CIRCUITO'),
                          }}
                      />
                  </Grid>
                  <Grid item xs={12}>
                      <Button fullWidth variant="outlined" onClick={() => setFilters({ SUCURSAL: [], RUTA: [], CIRCUITO: [] })}>Limpiar Filtros</Button>
                  </Grid>
              </Grid>
          </AccordionDetails>
      </Accordion>

      <SummaryTable title="Sucursal" data={summaryData.sucursal} />
      <SummaryTable title="Ruta" data={summaryData.ruta} />
      <SummaryTable title="Circuito" data={summaryData.circuito} />

      <Paper elevation={2} sx={{ p: 2, mt: 4, overflowX: 'auto' }}>
        <Box sx={{display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2}}>
          <Typography variant="h6">Detalle de Puntos de Venta</Typography>
          <Button variant="contained" color="secondary" onClick={handleExport}>Exportar a Excel</Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <ToggleButtonGroup color="primary" value={view} exclusive onChange={(e, v) => v && setView(v)} size="small">
            <ToggleButton value="all">Todos</ToggleButton>
            <ToggleButton value="implemented">Implementados</ToggleButton>
            <ToggleButton value="unimplemented">No Implementados</ToggleButton>
          </ToggleButtonGroup>
          <TextField label="Buscar en detalle..." variant="outlined" size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{width: { xs: '100%', sm: 300 }}}/>
        </Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderStyle}>Mesa</TableCell>
                <TableCell sx={tableHeaderStyle}>Ruta</TableCell>
                <TableCell sx={tableHeaderStyle}>Circuito</TableCell>
                <TableCell sx={tableHeaderStyle}>IDPDV</TableCell>
                <TableCell sx={tableHeaderStyle}>Nombre Punto</TableCell>
                <TableCell sx={tableHeaderStyle} align="center">Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {finalDetailedData.map(pdv => (
                <TableRow key={pdv.id} sx={{ backgroundColor: circuitColorMap[pdv.CIRCUITO || 'Sin Asignar'], '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell>{pdv.MESA}</TableCell>
                  <TableCell>{pdv.RUTA}</TableCell>
                  <TableCell>{pdv.CIRCUITO}</TableCell>
                  <TableCell>{pdv.IDPDV}</TableCell>
                  <TableCell>{pdv.NOMBRE_PUNTO}</TableCell>
                  <TableCell align="center">
                    <Chip label={pdv.implementado ? '100%' : '0%'} sx={pdv.implementado ? getStatusStyle(100) : getStatusStyle(0)} size="small"/>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {finalDetailedData.length === 0 && <Typography sx={{textAlign: 'center', p: 4}}>No hay datos para mostrar.</Typography>}
      </Paper>
    </Box>
  );
};

export default DashboardPage;
