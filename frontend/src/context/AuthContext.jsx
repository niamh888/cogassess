import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("cogassess_token"));
  const [clinicianName, setClinicianName] = useState(() => localStorage.getItem("cogassess_name") || "");

  const login = useCallback((accessToken, name) => {
    localStorage.setItem("cogassess_token", accessToken);
    localStorage.setItem("cogassess_name", name);
    setToken(accessToken);
    setClinicianName(name);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cogassess_token");
    localStorage.removeItem("cogassess_name");
    setToken(null);
    setClinicianName("");
  }, []);

  return (
    <AuthContext.Provider value={{ token, clinicianName, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
