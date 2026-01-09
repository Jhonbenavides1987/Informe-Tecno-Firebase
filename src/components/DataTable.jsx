import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  TableSortLabel 
} from '@mui/material';

const DataTable = ({ data, sortConfig, requestSort }) => {
  if (!data.length) {
    return <p>No hay datos para mostrar. Sube un archivo para empezar.</p>;
  }

  const columns = Object.keys(data[0]);

  return (
    <TableContainer component={Paper} elevation={3}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              // Estilos para el encabezado: fondo azul, texto blanco y negrita
              <TableCell 
                key={column}
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'common.white',
                  fontWeight: 'bold'
                }}
              >
                <TableSortLabel
                  active={sortConfig.key === column}
                  direction={sortConfig.direction}
                  onClick={() => requestSort(column)}
                  sx={{
                    // Asegurarse de que la flecha de ordenamiento también sea blanca
                    '&.Mui-active': {
                      color: 'common.white',
                    },
                    '& .MuiTableSortLabel-icon': {
                      color: 'common.white !important',
                    },
                  }}
                >
                  {column}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow 
              key={index}
              // Efecto hover corregido usando el color del tema
              sx={{
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.action.hover,
                },
              }}
            >
              {columns.map((column) => (
                <TableCell key={column}>{row[column]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataTable;
