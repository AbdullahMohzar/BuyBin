// import { createContext, useContext, useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import jwtDecode from 'jwt-decode'; // works now


// export const AuthContext = createContext();

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) throw new Error('useAuth must be used within an AuthProvider');
//   return context;
// };

// export const AuthProvider = ({ children }) => {
//   const navigate = useNavigate();
//   const [user, setUser] = useState(null);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       try {
//         const decoded = jwtDecode(token);
//         setUser({ name: decoded.name, email: decoded.email, photoUrl: decoded.picture });
//         setIsAuthenticated(true);
//       } catch (err) {
//         console.error('Invalid token', err);
//         localStorage.removeItem('token');
//       }
//     }
//   }, []);

//   const login = (credential) => {
//     try {
//       const decoded = jwtDecode(credential);
//       localStorage.setItem('token', credential);
//       setUser({ name: decoded.name, email: decoded.email, photoUrl: decoded.picture });
//       setIsAuthenticated(true);
//       navigate('/Dashboard');
//     } catch (err) {
//       console.error('Google login failed', err);
//     }
//   };

//   const logout = () => {
//     localStorage.removeItem('token');
//     setUser(null);
//     setIsAuthenticated(false);
//     navigate('/');
//   };

//   return (
//     <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };
