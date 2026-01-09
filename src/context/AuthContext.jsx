import React, { createContext, useState, useContext, useEffect } from 'react'; // Importar useEffect
import { auth } from '../firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ¡CORREGIDO! Usamos useEffect, no useState.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    // Cleanup
    return () => unsubscribe();
  }, []); // El array vacío asegura que esto solo se ejecute una vez.

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      console.error("Error de autenticación:", error.code);
      return { success: false, error: "Credenciales incorrectas. Verifica el email y la contraseña." };
    }
  };

  const logout = () => {
    signOut(auth);
  };

  const value = {
    isAuthenticated: !!user,
    user,
    login,
    logout,
    loading,
  };

  // Mientras el estado inicial de auth está cargando, no mostramos nada para evitar parpadeos.
  if (loading) {
    return null; 
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
