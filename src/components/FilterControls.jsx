import React from 'react';
import { Box, TextField, Typography } from '@mui/material';

const FilterControls = ({ headers, filters, setFilters }) => {
  const handleFilterChange = (header, value) => {
    setFilters(prev => ({
      ...prev,
      [header]: value,
    }));
  };

  return (
    <Box sx={{ p: 2, mt: 2, border: '1px solid #ccc', borderRadius: '5px' }}>
      <Typography variant="h6" gutterBottom>
        Filtros
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {headers.map(header => (
          <TextField
            key={header}
            label={header}
            variant="outlined"
            value={filters[header] || ''}
            onChange={(e) => handleFilterChange(header, e.target.value)}
            size="small"
          />
        ))}
      </Box>
    </Box>
  );
};

export default FilterControls;
