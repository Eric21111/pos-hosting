import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {

    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const logout = async () => {
    // Notify backend to mark employee as offline
    if (currentUser?._id) {
      try {
        await fetch('http://localhost:5000/api/employees/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: currentUser._id })
        });
      } catch (err) {
        console.error('Error notifying logout:', err);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const isOwner = () => {
    return currentUser?.role === 'Owner' || currentUser?.name === 'owner' || currentUser?.id === 3;
  };


  const hasPermission = (permission) => {
    if (!currentUser) return false;


    if (isOwner()) return true;


    if (currentUser.permissions && currentUser.permissions[permission] !== undefined) {
      return currentUser.permissions[permission];
    }

    return false;
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isOwner, hasPermission }}>
      {children}
    </AuthContext.Provider>);

};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;