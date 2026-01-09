import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  Card, CardContent, Accordion, AccordionSummary, AccordionDetails,
  ToggleButton, ToggleButtonGroup, TextField, TablePagination
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { collection, getDocs } from 'firebase/firestore';
import { firestore as db } from '../firebase.js';
import * as XLSX from 'xlsx';
import FilterControls from '../components/FilterControls';

const KpiCard = ({ title, value, color = 'text.primary' }) => (
  <Card sx={{ textAlign: 'center', height: '100%' }} elevation={3}>
    <CardContent>
      <Typography color="text.secondary" gutterBottom>{title}</Typography>
      <Typography variant="h4" component="div" color={color}>{value}</Typography>
    </CardContent>
  </Card>
);

const getStatusChip = (row) => {
  if (row.VISITAS_M0 > 0) return <Chip label="Visitado" color="success" size="small" variant="filled" />;
  if (row.PLANIF_M0 > 0) return <Chip label="No Visitado" color="warning" size="small" variant="outlined" />;
  return <Chip label="No Planeado" color="default" size="small" />;
};

const isAlertaStockRed = (stock, segment) => {
  if (stock === null || stock === undefined) return false;
  const s = Number(stock);
  return segment === 'PDA' ? (s < 6 || s > 40) : (s < 3 || s > 20);
};

const isQuiebreRed = (stock, segment) => {
  if (stock === null || stock === undefined) return false;
  const s = Number(stock);
  return segment === 'PDA' ? s < 6 : s <= 2;
};

const getAlertaStockChip = (stock, segment) => {
  if (stock === null || stock === undefined) return stock;
  const s = Number(stock);
  let color = 'success';
  if (segment === 'PDA') {
    if (s < 6 || s > 40) color = 'error';
    else if (s > 20) color = 'warning';
  } else {
    if (s < 3 || s > 20) color = 'error';
    else if (s > 10) color = 'warning';
  }
  return <Chip label={s} color={color} size="small" />;
};

const getQuiebreChip = (stock, segment) => {
  if (stock === null || stock === undefined) return stock;
  const s = Number(stock);
  const isQuiebre = segment === 'PDA' ? s < 6 : s <= 2;
  return <Chip label={s} color={isQuiebre ? 'error' : 'success'} size="small" />;
};

const getQuiebreStatusStyle = (percentage) => ({
  backgroundColor: percentage > 3.76 ? '#f44336' : '#4caf50',
  color: 'white',
});

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
        if (item.VISITAS_M0 === 0) group.noVisitados++;
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
    })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [data, groupBy]);

  const totals = useMemo(() => {
    const totalRow = summarizedData.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        if (typeof row[key] === 'number') acc[key] = (acc[key] || 0) + row[key];
      });
      return acc;
    }, { total: 0, planeados: 0, visitados: 0, noVisitados: 0, stockAlerts: 0, quiebres: 0, conScanneo: 0 });
    totalRow.porcQuiebre = totalRow.total > 0 ? (totalRow.quiebres / totalRow.total) * 100 : 0;
    return totalRow;
  }, [summarizedData]);

  const tableHeaderStyle = { backgroundColor: '#f3e5f5', color: '#4a148c', fontWeight: 'bold', textTransform: 'uppercase' };

  return (
    <TableContainer component={Paper} elevation={3} sx={{ mb: 3 }}>
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
              {Object.keys(totals).filter(k => k !== 'name').map(key => (
                <TableCell key={key} align="center" sx={{ fontWeight: 'bold', color: ['noVisitados', 'stockAlerts', 'quiebres'].includes(key) ? '#ed6c02' : 'inherit' }}>
                  {key === 'porcQuiebre' ? <Chip label={`${totals[key].toFixed(2)}%`} sx={getQuiebreStatusStyle(totals[key])} size="small" /> : totals[key]}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </TableContainer>
  );
};

const DashboardPlaneacionPage = () => {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ SUCURSAL: [], RUTA: [], CIRCUITO: [], DIAS_FRECUENCIA: [] });
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
        const fetchedData = querySnapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id, ...d,
                RUTA: d.Ruta, // Normalizando la clave
                CIRCUITO: d.CIRCUIT_CODE, // Normalizando la clave
                PLANIF_M0: Number(d.PLANIF_M0 || 0),
                VISITAS_M0: Number(d.VISITAS_M0 || 0),
                STOCK_M0: d.STOCK_M0 !== undefined && d.STOCK_M0 !== null ? Number(d.STOCK_M0) : null,
                CANT_ABAST_M0: Number(d.CANT_ABAST_M0 || 0),
            };
        });
        setAllData(fetchedData);
      } catch (e) {
        console.error('Error fetching data: ', e);
        setError(`Ocurrió un error al cargar los datos: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFilterChange = (name, value) => {
      setFilters(prev => ({ ...prev, [name]: value }));
      setPage(0);
  };

  const getFilterData = (filterName) => {
      let data = allData;
      if (filters.SUCURSAL.length) {
          data = data.filter(pdv => filters.SUCURSAL.includes(pdv.SUCURSAL));
      }
      if (filterName === 'CIRCUITO' && filters.RUTA.length) {
          data = data.filter(pdv => filters.RUTA.includes(pdv.RUTA));
      }
      return data;
  }

  const filteredData = useMemo(() => {
    return allData.filter(pdv => 
      (filters.SUCURSAL.length === 0 || filters.SUCURSAL.includes(pdv.SUCURSAL)) &&
      (filters.RUTA.length === 0 || filters.RUTA.includes(pdv.RUTA)) &&
      (filters.CIRCUITO.length === 0 || filters.CIRCUITO.includes(pdv.CIRCUITO)) &&
      (filters.DIAS_FRECUENCIA.length === 0 || filters.DIAS_FRECUENCIA.includes(pdv.DIAS_FRECUENCIA))
    );
  }, [allData, filters]);

  const finalDetailedData = useMemo(() => {
    let data = filteredData;

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
        Object.keys(item).some(key => String(item[key]).toLowerCase().includes(lowercasedFilter))
      );
    }
    
    return data.sort((a, b) => (a.CIRCUITO || '').localeCompare(b.CIRCUITO || '') || (a.RUTA || '').localeCompare(b.RUTA || ''));

  }, [filteredData, view, criticalFilter, searchTerm]);

  const mainMetrics = useMemo(() => {
      const data = filteredData;
      const totalPuntos = data.length;
      const planeados = data.filter(d => d.PLANIF_M0 > 0).length;
      const visitados = data.filter(d => d.VISITAS_M0 > 0).length;
      const noVisitados = planeados - visitados;
      return {
          totalPuntos,
          planeados,
          visitados,
          noVisitados,
          porcPlaneacion: totalPuntos > 0 ? (planeados / totalPuntos) * 100 : 0,
          porcEfectividad: planeados > 0 ? (visitados / planeados) * 100 : 0,
      };
  }, [filteredData]);

  const handleExport = () => {
    const dataToExport = finalDetailedData.map(pdv => ({
      'Mesa': pdv.Mesa, 'Ruta': pdv.RUTA, 'Circuito': pdv.CIRCUITO, 'IDPDV': pdv.ID_PDV, 'Segmentación': pdv.SEGMENT_PDV,
      'Planificado': pdv.PLANIF_M0, 'Visitado': pdv.VISITAS_M0,
      'Estado': pdv.VISITAS_M0 > 0 ? 'Visitado' : (pdv.PLANIF_M0 > 0 ? 'No Visitado' : 'No Planeado'),
      'Scanneo': pdv.CANT_ABAST_M0, 'Stock': pdv.STOCK_M0,
      'Alerta Stock': isAlertaStockRed(pdv.STOCK_M0, pdv.SEGMENT_PDV) ? 'Sí' : 'No',
      'Quiebre': isQuiebreRed(pdv.STOCK_M0, pdv.SEGMENT_PDV) ? 'Sí' : 'No',
      'Dias Frecuencia': pdv.DIAS_FRECUENCIA,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DetallePlaneacion");
    XLSX.writeFile(workbook, "Detalle_Planeacion.xlsx");
  };

  const resetFilters = () => {
      setFilters({ SUCURSAL: [], RUTA: [], CIRCUITO: [], DIAS_FRECUENCIA: [] });
      setView('all'); 
      setCriticalFilter(null); 
      setSearchTerm(''); 
      setPage(0);
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 3 }}>Dashboard de Planeación y Visita</Typography>

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
              <Grid container spacing={2}>
                  <Grid item xs={12}>
                      <FilterControls
                          headers={['SUCURSAL', 'RUTA', 'CIRCUITO', 'DIAS_FRECUENCIA']}
                          filters={filters}
                          onFilterChange={handleFilterChange}
                          dataForOptions={{
                              SUCURSAL: allData,
                              RUTA: getFilterData('RUTA'),
                              CIRCUITO: getFilterData('CIRCUITO'),
                              DIAS_FRECUENCIA: allData,
                          }}
                      />
                  </Grid>
                  <Grid item xs={12}>
                      <Button fullWidth variant="outlined" onClick={resetFilters}>Limpiar Filtros</Button>
                  </Grid>
              </Grid>
          </AccordionDetails>
      </Accordion>

      <SummaryTable title="Sucursal" data={filteredData} groupBy="SUCURSAL" />
      <SummaryTable title="Ruta" data={filteredData} groupBy="RUTA" />
      <SummaryTable title="Circuito" data={filteredData} groupBy="CIRCUITO" />

      <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
        <Box sx={{display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2}}>
          <Typography variant="h6">Detalle de Puntos de Venta</Typography>
          <Button variant="contained" color="secondary" onClick={handleExport}>Exportar a Excel</Button>
        </Box>

         <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
            <Grid item xs={12} md={6}>
                <ToggleButtonGroup color="primary" value={view} exclusive onChange={(e, v) => v && setView(v)} size="small" fullWidth>
                    <ToggleButton value="all">Todos</ToggleButton>
                    <ToggleButton value="planned">Planeados</ToggleButton>
                    <ToggleButton value="unplanned">No Planeados</ToggleButton>
                    <ToggleButton value="visited">Visitados</ToggleButton>
                    <ToggleButton value="unvisited">No Visitados</ToggleButton>
                </ToggleButtonGroup>
            </Grid>
             <Grid item xs={12} md={6}>
                <ToggleButtonGroup color="error" value={criticalFilter} exclusive onChange={(e, v) => v && setCriticalFilter(v)} size="small" fullWidth>
                    <ToggleButton value="scanneo">Scanneo Cero</ToggleButton>
                    <ToggleButton value="alerta">Alerta Stock</ToggleButton>
                    <ToggleButton value="quiebre">Quiebre</ToggleButton>
                </ToggleButtonGroup>
            </Grid>
             <Grid item xs={12}>
                <TextField label="Buscar..." variant="outlined" size="small" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} fullWidth/>
            </Grid>
        </Grid>

        <TableContainer>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Mesa</TableCell>
                        <TableCell>Ruta</TableCell>
                        <TableCell>Circuito</TableCell>
                        <TableCell>IDPDV</TableCell>
                        <TableCell align="center">Segmentación</TableCell>
                        <TableCell align="center">Plan.</TableCell>
                        <TableCell align="center">Visit.</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="center">Scanneo</TableCell>
                        <TableCell align="center">Stock</TableCell>
                        <TableCell align="center">Quiebre</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {finalDetailedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(pdv => (
                        <TableRow key={pdv.id} hover>
                            <TableCell>{pdv.Mesa}</TableCell>
                            <TableCell>{pdv.RUTA}</TableCell>
                            <TableCell>{pdv.CIRCUITO}</TableCell>
                            <TableCell>{pdv.ID_PDV}</TableCell>
                            <TableCell align="center">{pdv.SEGMENT_PDV}</TableCell>
                            <TableCell align="center">{pdv.PLANIF_M0}</TableCell>
                            <TableCell align="center">{pdv.VISITAS_M0}</TableCell>
                            <TableCell align="center">{getStatusChip(pdv)}</TableCell>
                            <TableCell align="center">{pdv.CANT_ABAST_M0 > 0 ? <Chip label={pdv.CANT_ABAST_M0} color="success" size="small" /> : <Chip label={0} color="error" size="small" />}</TableCell>
                            <TableCell align="center">{getAlertaStockChip(pdv.STOCK_M0, pdv.SEGMENT_PDV)}</TableCell>
                            <TableCell align="center">{getQuiebreChip(pdv.STOCK_M0, pdv.SEGMENT_PDV)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
        <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={finalDetailedData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>
    </Box>
  );
};

export default DashboardPlaneacionPage;
