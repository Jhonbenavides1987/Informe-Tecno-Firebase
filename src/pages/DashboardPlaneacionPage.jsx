
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  Card, CardContent, Accordion, AccordionSummary, AccordionDetails, FormControl,
  InputLabel, Select, MenuItem, ToggleButton, ToggleButtonGroup, TextField, TablePagination
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { collection, getDocs } from 'firebase/firestore';
import { firestore as db } from '../firebase.js';
import * as XLSX from 'xlsx';

// --- Helper: KPI Card Component ---
const KpiCard = ({ title, value, color = 'text.primary' }) => (
  <Card sx={{ textAlign: 'center', height: '100%' }} elevation={3}>
    <CardContent>
      <Typography color="text.secondary" gutterBottom>{title}</Typography>
      <Typography variant="h4" component="div" color={color}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

// --- Estado Chip Logic ---
const getStatusChip = (row) => {
  if (row.VISITAS_M0 > 0) {
    return <Chip label="Visitado" color="success" size="small" variant="filled" />;
  }
  if (row.PLANIF_M0 > 0) {
    return <Chip label="No Visitado" color="warning" size="small" variant="outlined" />;
  }
  return <Chip label="No Planeado" color="default" size="small" />;
};


// --- Funciones de Lógica de Negocio ---
const isAlertaStockRed = (stock, segment) => {
  if (stock === null || stock === undefined) return false;
  const s = Number(stock);
  if (segment === 'PDA') {
    return s < 6 || s > 40;
  }
  // PDV y otros
  return s < 3 || s > 20;
};

const isQuiebreRed = (stock, segment) => {
  if (stock === null || stock === undefined) return false;
  const s = Number(stock);
  if (segment === 'PDA') {
    return s < 6;
  }
  // PDV y otros
  return s <= 2;
};


// --- Nuevas funciones de Chip para Tabla de Detalle ---
const getAlertaStockChip = (stock, segment) => {
  if (stock === null || stock === undefined) return stock;
  const s = Number(stock);
  let color = 'success';

  if (segment === 'PDA') {
    if (s >= 6 && s <= 20) color = 'success';
    else if (s >= 21 && s <= 40) color = 'warning';
    else color = 'error';
  } else { // PDV y otros
    if (s >= 3 && s <= 10) color = 'success';
    else if (s >= 11 && s <= 20) color = 'warning';
    else color = 'error';
  }
  return <Chip label={s} color={color} size="small" />;
};

const getQuiebreChip = (stock, segment) => {
  if (stock === null || stock === undefined) return stock;
  const s = Number(stock);
  let color = 'success';

  if (segment === 'PDA') {
    if (s < 6) color = 'error';
    else color = 'success';
  } else { // PDV y otros
    if (s <= 2) color = 'error';
    else color = 'success';
  }
  return <Chip label={s} color={color} size="small" />;
};

const getQuiebreStatusStyle = (percentage) => {
  if (percentage > 3.76) return { backgroundColor: '#f44336', color: 'white' };
  return { backgroundColor: '#4caf50', color: 'white' };
};

// --- Componente de Tabla de Resumen ---
const SummaryTable = ({ title, data, groupBy }) => {
  const summarizedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const groups = data.reduce((acc, item) => {
      const groupName = item[groupBy] || 'Sin Asignar';
      if (!acc[groupName]) {
        acc[groupName] = { total: 0, planeados: 0, visitados: 0, noVisitados: 0, stockAlerts: 0, quiebres: 0, conScanneo: 0 };
      }
      const group = acc[groupName];
      group.total++;
      if (item.PLANIF_M0 > 0) {
        group.planeados++;
        if (item.VISITAS_M0 === 0) {
          group.noVisitados++;
        }
      }
      if (item.VISITAS_M0 > 0) group.visitados++;
      if (isAlertaStockRed(item.STOCK_M0, item.SEGMENT_PDV)) group.stockAlerts++;
      if (isQuiebreRed(item.STOCK_M0, item.SEGMENT_PDV)) group.quiebres++;
      if (item.CANT_ABAST_M0 > 0) group.conScanneo++;
      return acc;
    }, {});

    return Object.entries(groups).map(([name, values]) => ({
      name,
      ...values,
      porcQuiebre: values.total > 0 ? (values.quiebres / values.total) * 100 : 0,
    })).sort((a,b) => String(a.name).localeCompare(String(b.name)));
  }, [data, groupBy]);

  const totals = useMemo(() => {
    const totalRow = summarizedData.reduce((acc, row) => {
      acc.total += row.total;
      acc.planeados += row.planeados;
      acc.visitados += row.visitados;
      acc.noVisitados += row.noVisitados;
      acc.stockAlerts += row.stockAlerts;
      acc.quiebres += row.quiebres;
      acc.conScanneo += row.conScanneo;
      return acc;
    }, { total: 0, planeados: 0, visitados: 0, noVisitados: 0, stockAlerts: 0, quiebres: 0, conScanneo: 0 });

    totalRow.porcQuiebre = totalRow.total > 0 ? (totalRow.quiebres / totalRow.total) * 100 : 0;
    return totalRow;
  }, [summarizedData]);

  const tableHeaderStyle = { backgroundColor: '#f3e5f5', color: '#4a148c', fontWeight: 'bold', textTransform: 'uppercase' };

  return (
    <TableContainer component={Paper} elevation={3} sx={{mb: 3}}>
      <Typography variant="h6" sx={{ p: 2, textTransform: 'capitalize' }}>Resumen por {title}</Typography>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={tableHeaderStyle}>{title}</TableCell>
            <TableCell align="center" sx={tableHeaderStyle}>Total PDV</TableCell>
            <TableCell align="center" sx={tableHeaderStyle}>Planeados</TableCell>
            <TableCell align="center" sx={tableHeaderStyle}>Visitados</TableCell>
            <TableCell align="center" sx={tableHeaderStyle}>No Visitados</TableCell>
            <TableCell align="center" sx={tableHeaderStyle}>Scanneo</TableCell>
            <TableCell align="center" sx={tableHeaderStyle}>Alertas Stock</TableCell>
            <TableCell align="center" sx={tableHeaderStyle}>Quiebres</TableCell>
            <TableCell align="center" sx={tableHeaderStyle}>% Quiebre</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {summarizedData.map((row) => (
            <TableRow key={row.name} hover>
              <TableCell>{row.name}</TableCell>
              <TableCell align="center">{row.total}</TableCell>
              <TableCell align="center">{row.planeados}</TableCell>
              <TableCell align="center">{row.visitados}</TableCell>
              <TableCell align="center" sx={{ color: '#ed6c02', fontWeight: 'bold' }}>{row.noVisitados}</TableCell>
              <TableCell align="center">{row.conScanneo}</TableCell>
              <TableCell align="center" sx={{ color: '#f44336', fontWeight: 'bold' }}>{row.stockAlerts}</TableCell>
              <TableCell align="center" sx={{ color: '#f44336', fontWeight: 'bold' }}>{row.quiebres}</TableCell>
              <TableCell align="center"><Chip label={`${row.porcQuiebre.toFixed(2)}%`} sx={getQuiebreStatusStyle(row.porcQuiebre)} size="small" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
        {summarizedData.length > 0 && (
          <TableFooter sx={{ backgroundColor: '#fafafa', borderTop: '2px solid #e0e0e0' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Total</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>{totals.total}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>{totals.planeados}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>{totals.visitados}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#ed6c02' }}>{totals.noVisitados}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>{totals.conScanneo}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#f44336' }}>{totals.stockAlerts}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#f44336' }}>{totals.quiebres}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}><Chip label={`${totals.porcQuiebre.toFixed(2)}%`} sx={getQuiebreStatusStyle(totals.porcQuiebre)} size="small" /></TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </TableContainer>
  );
};


// --- Componente Principal del Dashboard ---
const DashboardPlaneacionPage = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ sucursal: '', ruta: '', circuito: '', DIAS_FRECUENCIA: [] });
  const [view, setView] = useState('all');
  const [criticalFilter, setCriticalFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'Planeacion'));
        if (querySnapshot && !querySnapshot.empty) {
          const fetchedData = querySnapshot.docs
            .filter(doc => doc.exists && doc.data())
            .map(doc => {
              const d = doc.data();
              return {
                id: doc.id, ...d,
                PLANIF_M0: Number(d.PLANIF_M0 || 0),
                VISITAS_M0: Number(d.VISITAS_M0 || 0),
                STOCK_M0: d.STOCK_M0 !== undefined && d.STOCK_M0 !== null ? Number(d.STOCK_M0) : null,
                CANT_ABAST_M0: Number(d.CANT_ABAST_M0 || 0),
              };
            });

          if (fetchedData.length > 0) {
            setAllData(fetchedData);
            setError(null);
          } else {
             setError('Los datos existen pero parecen estar vacíos después de la validación. Revise el contenido de la colección "Planeacion".');
          }
        } else {
          setError('No se encontraron datos en la colección "Planeacion". Por favor, carga un archivo y espera a que los datos sean procesados.');
        }
      } catch (e) {
        console.error('Error fetching data: ', e);
        setError(`Ocurrió un error al cargar los datos: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Filtering & Sorting Logic ---
  const handleFilterChange = (name, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      if (name === 'sucursal') { newFilters.ruta = ''; newFilters.circuito = ''; }
      if (name === 'ruta') { newFilters.circuito = ''; }
      return newFilters;
    });
    setPage(0); // Reset page on filter change
  };
  
  const handleViewChange = (e, v) => {
    if (v) setView(v);
    setPage(0);
  }

  const handleCriticalFilterChange = (e, v) => {
    setCriticalFilter(v);
    setPage(0);
  }
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  }

  const filterOptions = useMemo(() => {
    const sucursales = [...new Set(allData.map(p => p.SUCURSAL).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    const rutas = [...new Set(allData.filter(p => !filters.sucursal || p.SUCURSAL === filters.sucursal).map(p => p.Ruta).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    const circuitos = [...new Set(allData.filter(p => (!filters.sucursal || p.SUCURSAL === filters.sucursal) && (!filters.ruta || p.Ruta === filters.ruta) ).map(p => p.CIRCUIT_CODE).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b)));
    const diasFrecuencia = [...new Set(allData.map(p => p.DIAS_FRECUENCIA).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    return { sucursales, rutas, circuitos, diasFrecuencia };
  }, [allData, filters.sucursal, filters.ruta]);

  const summaryData = useMemo(() => {
      return allData.filter(pdv =>
        (!filters.sucursal || pdv.SUCURSAL === filters.sucursal) &&
        (!filters.ruta || pdv.Ruta === filters.ruta) &&
        (!filters.circuito || pdv.CIRCUIT_CODE === filters.circuito) &&
        (filters.DIAS_FRECUENCIA.length === 0 || filters.DIAS_FRECUENCIA.includes(pdv.DIAS_FRECUENCIA))
      );
  }, [allData, filters]);

  const finalDetailedData = useMemo(() => {
    let data = summaryData;

    if (view === 'planned') data = data.filter(d => d.PLANIF_M0 > 0);
    if (view === 'unplanned') data = data.filter(d => d.PLANIF_M0 === 0);
    if (view === 'visited') data = data.filter(d => d.VISITAS_M0 > 0);
    if (view === 'unvisited') data = data.filter(d => d.VISITAS_M0 === 0 && d.PLANIF_M0 > 0);

    if (criticalFilter === 'scanneo') data = data.filter(d => d.CANT_ABAST_M0 === 0);
    if (criticalFilter === 'alerta') data = data.filter(d => isAlertaStockRed(d.STOCK_M0, d.SEGMENT_PDV));
    if (criticalFilter === 'quiebre') data = data.filter(d => isQuiebreRed(d.STOCK_M0, d.SEGMENT_PDV));

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      data = data.filter(item =>
        ['Mesa', 'Ruta', 'CIRCUIT_CODE', 'ID_PDV', 'SALESMAN_NAME'].some(key =>
          String(item[key] || '').toLowerCase().includes(lowercasedFilter)
        )
      );
    }
    
    // --- NUEVO ORDENAMIENTO ---
    return data.sort((a, b) => {
        const circuitA = Number(a.CIRCUIT_CODE) || 0;
        const circuitB = Number(b.CIRCUIT_CODE) || 0;
        if (circuitA !== circuitB) {
            return circuitA - circuitB;
        }
        return (a.Ruta || '').localeCompare(b.Ruta || '');
    });

  }, [summaryData, view, criticalFilter, searchTerm]);

  // --- KPI Calculations ---
  const mainMetrics = useMemo(() => {
      const data = summaryData;
      const totalPuntos = data.length;
      const planeados = data.filter(d => d.PLANIF_M0 > 0).length;
      const visitados = data.filter(d => d.VISITAS_M0 > 0).length;
      const noVisitados = data.filter(d => d.PLANIF_M0 > 0 && d.VISITAS_M0 === 0).length;
      const porcPlaneacion = totalPuntos > 0 ? (planeados / totalPuntos) * 100 : 0;
      const porcEfectividad = planeados > 0 ? (visitados / planeados) * 100 : 0;
      return { totalPuntos, planeados, visitados, noVisitados, porcPlaneacion, porcEfectividad };
  }, [summaryData]);

  // --- Pagination Handlers ---
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // --- Export to Excel ---
  const handleExport = () => {
    const dataToExport = finalDetailedData.map(pdv => ({
      'Mesa': pdv.Mesa || '#ERROR_N/A',
      'Ruta': pdv.Ruta || '#ERROR_N/A',
      'Circuito': pdv.CIRCUIT_CODE,
      'IDPDV': pdv.ID_PDV,
      'Segmentación': pdv.SEGMENT_PDV,
      'Planificado': pdv.PLANIF_M0,
      'Visitado': pdv.VISITAS_M0,
      'Estado': pdv.VISITAS_M0 > 0 ? 'Visitado' : (pdv.PLANIF_M0 > 0 ? 'No Visitado' : 'No Planeado'),
      'Scanneo': pdv.CANT_ABAST_M0,
      'Alerta Stock (Valor)': pdv.STOCK_M0,
      'Es Alerta Roja': isAlertaStockRed(pdv.STOCK_M0, pdv.SEGMENT_PDV) ? 'Sí' : 'No',
      'Es Quiebre Rojo': isQuiebreRed(pdv.STOCK_M0, pdv.SEGMENT_PDV) ? 'Sí' : 'No',
      'Dias Frecuencia': pdv.DIAS_FRECUENCIA,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DetallePlaneacion");
    XLSX.writeFile(workbook, "Detalle_Planeacion_y_Visita.xlsx");
  };

  const detailHeaderStyle = {
    backgroundColor: '#e3f2fd',
    color: '#0d47a1',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap'
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>Dashboard de Planeación y Visita</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }} justifyContent="center">
         <Grid item xs={6} sm={4} md={2}><KpiCard title="Total Puntos" value={mainMetrics.totalPuntos.toLocaleString()} /></Grid>
        <Grid item xs={6} sm={4} md={2}><KpiCard title="Planeados" value={mainMetrics.planeados.toLocaleString()} color="primary.main"/></Grid>
        <Grid item xs={6} sm={4} md={2}><KpiCard title="% Planeación" value={`${mainMetrics.porcPlaneacion.toFixed(1)}%`} color="primary.main" /></Grid>
        <Grid item xs={6} sm={4} md={2}><KpiCard title="Visitados" value={mainMetrics.visitados.toLocaleString()} color="success.main" /></Grid>
        <Grid item xs={6} sm={4} md={2}><KpiCard title="No Visitados" value={mainMetrics.noVisitados.toLocaleString()} color="warning.main" /></Grid>
        <Grid item xs={12} sm={4} md={2}><KpiCard title="% Efectividad" value={`${mainMetrics.porcEfectividad.toFixed(1)}%`} color="success.main" /></Grid>
      </Grid>

      <Accordion sx={{ mb: 3, boxShadow: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Filtros</Typography></AccordionSummary>
          <AccordionDetails>
              <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4} md={3}><FormControl fullWidth size="small"><InputLabel>Sucursal</InputLabel><Select name="sucursal" value={filters.sucursal} label="Sucursal" onChange={e => handleFilterChange('sucursal', e.target.value)}>{filterOptions.sucursales.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl></Grid>
                  <Grid item xs={12} sm={4} md={3}><FormControl fullWidth size="small"><InputLabel>Ruta</InputLabel><Select name="ruta" value={filters.ruta} label="Ruta" onChange={e => handleFilterChange('ruta', e.target.value)}>{filterOptions.rutas.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}</Select></FormControl></Grid>
                  <Grid item xs={12} sm={4} md={3}><FormControl fullWidth size="small"><InputLabel>Circuito</InputLabel><Select name="circuito" value={filters.circuito} label="Circuito" onChange={e => handleFilterChange('circuito', e.target.value)}>{filterOptions.circuitos.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</Select></FormControl></Grid>
                  <Grid item xs={12} sm={4} md={3}><FormControl fullWidth size="small"><InputLabel>Dia de visita</InputLabel><Select multiple name="DIAS_FRECUENCIA" value={filters.DIAS_FRECUENCIA} label="Dia de visita" onChange={e => handleFilterChange('DIAS_FRECUENCIA', e.target.value)}>{filterOptions.diasFrecuencia.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}</Select></FormControl></Grid>
                  <Grid item xs={12}><Button fullWidth variant="outlined" onClick={() => { setFilters({ sucursal: '', ruta: '', circuito: '', DIAS_FRECUENCIA: [] }); setView('all'); setCriticalFilter(null); setSearchTerm(''); setPage(0); }}>Limpiar Filtros</Button></Grid>
              </Grid>
          </AccordionDetails>
      </Accordion>

      {!loading && !error && allData.length > 0 && (
        <Box>
          <SummaryTable title="Sucursal" data={summaryData} groupBy="SUCURSAL" />
          <SummaryTable title="Ruta" data={summaryData} groupBy="Ruta" />
          <SummaryTable title="Circuito" data={summaryData} groupBy="CIRCUIT_CODE" />

          <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
            <Box sx={{display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2}}>
              <Typography variant="h6">Detalle de Puntos de Venta</Typography>
              <Button variant="contained" color="secondary" onClick={handleExport}>Exportar a Excel</Button>
            </Box>

             <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
                <Grid item xs={12} md={6}>
                    <ToggleButtonGroup color="primary" value={view} exclusive onChange={handleViewChange} size="small" fullWidth>
                        <ToggleButton value="all">Todos</ToggleButton>
                        <ToggleButton value="planned">Planeados</ToggleButton>
                        <ToggleButton value="unplanned">No Planeados</ToggleButton>
                        <ToggleButton value="visited">Visitados</ToggleButton>
                        <ToggleButton value="unvisited">No Visitados</ToggleButton>
                    </ToggleButtonGroup>
                </Grid>
                 <Grid item xs={12} md={6}>
                    <ToggleButtonGroup color="error" value={criticalFilter} exclusive onChange={handleCriticalFilterChange} size="small" fullWidth>
                        <ToggleButton value="scanneo">Scanneo Cero</ToggleButton>
                        <ToggleButton value="alerta">Alerta Stock</ToggleButton>
                        <ToggleButton value="quiebre">Quiebre</ToggleButton>
                    </ToggleButtonGroup>
                </Grid>
                 <Grid item xs={12}>
                    <TextField label="Buscar..." variant="outlined" size="small" value={searchTerm} onChange={handleSearchChange} fullWidth/>
                </Grid>
            </Grid>

            <TableContainer>
                <Table stickyHeader size="small" sx={{tableLayout: 'fixed'}}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{...detailHeaderStyle, width: '10%'}}>Mesa</TableCell>
                            <TableCell sx={{...detailHeaderStyle, width: '12%'}}>Ruta</TableCell>
                            <TableCell sx={{...detailHeaderStyle, width: '8%'}}>Circuito</TableCell>
                            <TableCell sx={{...detailHeaderStyle, width: '10%'}}>IDPDV</TableCell>
                            <TableCell align="center" sx={{...detailHeaderStyle, width: '10%'}}>Segmentación</TableCell>
                            <TableCell align="center" sx={{...detailHeaderStyle, width: '8%'}}>Plan.</TableCell>
                            <TableCell align="center" sx={{...detailHeaderStyle, width: '8%'}}>Visit.</TableCell>
                            <TableCell align="center" sx={{...detailHeaderStyle, width: '10%'}}>Estado</TableCell>
                            <TableCell align="center" sx={{...detailHeaderStyle, width: '8%'}}>Scanneo</TableCell>
                            <TableCell align="center" sx={{...detailHeaderStyle, width: '8%'}}>Stock</TableCell>
                            <TableCell align="center" sx={{...detailHeaderStyle, width: '8%'}}>Quiebre</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {finalDetailedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(pdv => (
                            <TableRow key={pdv.id} hover>
                                <TableCell sx={{wordBreak: 'break-word'}}>{pdv.Mesa || '#ERROR_N/A'}</TableCell>
                                <TableCell sx={{wordBreak: 'break-word'}}>{pdv.Ruta || '#ERROR_N/A'}</TableCell>
                                <TableCell>{pdv.CIRCUIT_CODE}</TableCell>
                                <TableCell sx={{wordBreak: 'break-word'}}>{pdv.ID_PDV}</TableCell>
                                <TableCell align="center">{pdv.SEGMENT_PDV}</TableCell>
                                <TableCell align="center">{pdv.PLANIF_M0}</TableCell>
                                <TableCell align="center">{pdv.VISITAS_M0}</TableCell>
                                <TableCell align="center">{getStatusChip(pdv)}</TableCell>
                                <TableCell align="center">
                                  {pdv.CANT_ABAST_M0 > 0
                                    ? <Chip label={pdv.CANT_ABAST_M0} color="success" size="small" />
                                    : <Chip label={0} color="error" size="small" />
                                  }
                                </TableCell>
                                <TableCell align="center">
                                  {getAlertaStockChip(pdv.STOCK_M0, pdv.SEGMENT_PDV)}
                                </TableCell>
                                <TableCell align="center">
                                  {getQuiebreChip(pdv.STOCK_M0, pdv.SEGMENT_PDV)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {finalDetailedData.length === 0 && <Typography sx={{textAlign: 'center', p: 4}}>No hay datos para mostrar con los filtros actuales.</Typography>}
            <TablePagination
                rowsPerPageOptions={[10, 25, 100]}
                component="div"
                count={finalDetailedData.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página:"
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default DashboardPlaneacionPage;
