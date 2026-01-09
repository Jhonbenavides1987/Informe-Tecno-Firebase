import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography, Checkbox, ListItemText, TextField, Paper, Chip } from '@mui/material';

const FilterControls = ({ headers, filters, onFilterChange, dataForOptions }) => {

  const getUniqueOptions = (header) => {
    const specificData = dataForOptions ? dataForOptions[header] : [];
    if (!specificData || specificData.length === 0) return [];
    
    const uniqueValues = new Set(specificData.map(item => item[header]).filter(Boolean));
    return [...uniqueValues].sort((a, b) => String(a).localeCompare(String(b)));
  };

  return (
    <Paper elevation={0} sx={{ p: 2, width: '100%' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {headers.map(header => {
                const isMultiple = ['RUTA', 'CIRCUITO', 'SUCURSAL', 'DIAS_FRECUENCIA'].includes(header);
                const options = getUniqueOptions(header);

                if (isMultiple) {
                    return (
                        <FormControl key={header} size="small" sx={{ minWidth: 200, flexGrow: 1 }}>
                            <InputLabel>{header.replace(/_/g, ' ')}</InputLabel>
                            <Select
                                multiple
                                value={filters[header] || []}
                                onChange={(e) => onFilterChange(header, e.target.value)}
                                label={header.replace(/_/g, ' ')}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => (
                                            <Chip key={value} label={value} size="small" />
                                        ))}
                                    </Box>
                                )}
                            >
                                {options.map(option => (
                                    <MenuItem key={option} value={option}>
                                        <Checkbox checked={(filters[header] || []).indexOf(option) > -1} />
                                        <ListItemText primary={option} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    );
                } else {
                    return (
                        <TextField
                            key={header}
                            label={header.replace(/_/g, ' ')}
                            variant="outlined"
                            value={filters[header] || ''}
                            onChange={(e) => onFilterChange(header, e.target.value)}
                            size="small"
                            sx={{ minWidth: 200, flexGrow: 1 }}
                        />
                    );
                }
            })}
        </Box>
    </Paper>
  );
};

export default FilterControls;
