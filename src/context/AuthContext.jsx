import React, { createContext, useState, useContext } from 'react';

// 1. Crear el Contexto
export const AuthContext = createContext(null);

// Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// 2. Crear el Proveedor del Contexto
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Esta es la contraseña maestra. 
  // La guardamos en una variable de entorno en un caso real, pero aquí está bien para empezar.
  const MASTER_PASSWORD = 'admin'; // ¡Podemos cambiar esto por lo que quieras!

  const login = (password) => {
    if (password === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      return true; // Éxito
    }
    return false; // Fallo
  };

  const logout = () => {
    // Podríamos añadir un botón de "cerrar sesión" en el futuro si es necesario
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
