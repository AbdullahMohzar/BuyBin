import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { auth } from './firebase'; // Adjust path as needed
import { CartProvider } from './Context/CartContext';
import { ThemeProvider } from './Context/ThemeContext';
import { UserProvider } from './Context/UserContext';
// import { AuthProvider } from './context/AuthContext'; // Uncomment if implementing
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* <AuthProvider> */} {/* Uncomment if implementing AuthProvider */}
        <UserProvider>
          <ThemeProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </ThemeProvider>
        </UserProvider>
      {/* </AuthProvider> */}
    </BrowserRouter>
  </StrictMode>
);