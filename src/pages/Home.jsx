import React, { useState } from 'react';
import ExcelUploader from '../components/ExcelUploader';
import DataTable from '../components/DataTable';
import { Container, Typography } from '@mui/material';

const Home = () => {
  const [data, setData] = useState([]);

  return (
    <Container>
      <Typography variant="h3" component="h1" align="center" gutterBottom sx={{ mt: 4, color: '#1976d2' }}>
        Módulo de Carga de Excel
      </Typography>
      <ExcelUploader setData={setData} data={data} />
      <DataTable data={data} />
    </Container>
  );
};

export default Home;
