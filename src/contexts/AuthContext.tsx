import React, { createContext, useContext, useState } from 'react';

interface AuthUser {
  username: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, isAdmin: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>({
    username: '',
    isAuthenticated: false,
    isAdmin: false
  });

  const login = (username: string, isAdmin: boolean) => {
    setUser({
      username,
      isAuthenticated: true,
      isAdmin
    });
  };

  const logout = () => {
    setUser({
      username: '',
      isAuthenticated: false,
      isAdmin: false
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      isAuthenticated: user.isAuthenticated,
      isAdmin: user.isAdmin,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};