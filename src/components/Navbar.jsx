import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Importamos el hook de autenticación
import {
  AppBar, Toolbar, Typography, Button, Menu, MenuItem, Box, useTheme, useMediaQuery, IconButton, Drawer, List, ListItemButton, ListItemText, Collapse, Divider, Avatar, Tooltip
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';

const NavMenu = ({ title, items }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      <Button
        color="inherit"
        id={`${title}-button`}
        aria-controls={open ? `${title}-menu` : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleMenu}
        endIcon={<ArrowDropDownIcon />}
      >
        {title}
      </Button>
      <Menu
        id={`${title}-menu`}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': `${title}-button`,
        }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.to}
            onClick={handleClose}
            component={NavLink}
            to={item.to}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

const MobileSubMenu = ({ title, items, onLinkClick }) => {
    const [open, setOpen] = useState(false);

    const handleClick = () => {
        setOpen(!open);
    };

    return (
        <>
            <ListItemButton onClick={handleClick}>
                <ListItemText primary={title} />
                {open ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                    {items.map((item) => (
                        <ListItemButton
                            key={item.to}
                            sx={{ pl: 4 }}
                            component={NavLink}
                            to={item.to}
                            onClick={onLinkClick}
                        >
                            <ListItemText primary={item.label} />
                        </ListItemButton>
                    ))}
                </List>
            </Collapse>
        </>
    );
};


const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth(); // Obtenemos el usuario y la función de logout
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const dashboardItems = [
      { label: 'Pospago', to: '/dashboard-pospago' },
      { label: 'Prepago', to: '/dashboard-prepago' },
      { label: 'Durable', to: '/dashboard-durable' },
      { label: 'Activación', to: '/dashboard-activacion' },
      { label: 'Aliados', to: '/dashboard-aliados' },
      { label: 'Calendarios', to: '/dashboard-calendarios' },
      { label: 'Porta Afiches', to: '/dashboard-porta-afiches' },
      { label: 'Planeación', to: '/dashboard-planeacion' },
  ];

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ textAlign: 'center', flexGrow: 1 }}>
          <Typography variant="h6" sx={{ my: 2 }}>
            Menú
          </Typography>
          <Divider />
          <List>
              <ListItemButton component={NavLink} to="/carga-de-modulos" onClick={handleDrawerToggle}>
                  <ListItemText primary="Cargar Datos" primaryTypographyProps={{ fontWeight: 'bold', color: 'primary' }} />
              </ListItemButton>
              <Divider />
              <MobileSubMenu title="Dashboards" items={dashboardItems} onLinkClick={handleDrawerToggle} />
          </List>
      </Box>
      {/* Sección del usuario que aparece al final */}
      {user && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ width: 40, height: 40, mr: 2 }}>{user.email.charAt(0).toUpperCase()}</Avatar>
                <Tooltip title={user.email}>
                    <Typography variant="body2" noWrap>{user.email}</Typography>
                </Tooltip>
            </Box>
            <Button 
              variant="contained" 
              startIcon={<LogoutIcon />} 
              fullWidth
              onClick={() => { logout(); handleDrawerToggle(); }}
            >
              Cerrar Sesión
            </Button>
          </Box>
      )}
    </Box>
  );

  return (
    <>
      <AppBar position="fixed" color="primary" elevation={2}>
        <Toolbar>
          <Typography
            variant="h6"
            component={NavLink}
            to="/"
            sx={{ 
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            Panel de Control
          </Typography>
          {isMobile ? (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="end"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button 
                color="inherit" 
                component={NavLink} 
                to="/carga-de-modulos"
                variant="outlined"
                sx={{ mr: 2 }}
              >
                Cargar Datos
              </Button>
              <NavMenu title="Dashboards" items={dashboardItems} />
               {/* Información del usuario en la barra superior para escritorio */}
               {user && (
                 <Box sx={{ display: 'flex', alignItems: 'center', ml: 3, pl: 3, borderLeft: '1px solid white' }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1.5 }}>{user.email.charAt(0).toUpperCase()}</Avatar>
                    <Button color="inherit" onClick={logout}>Cerrar Sesión</Button>
                 </Box>
               )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <nav>
        <Drawer
          variant="temporary"
          anchor="right"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
          }}
        >
          {drawerContent}
        </Drawer>
      </nav>
    </>
  );
};

export default Navbar;
