import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './Components/Navbar.jsx';
import ErrorBoundary from './Components/ErrorBoundary.jsx';
import Search from './pages/Search.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Cart from './pages/Cart.jsx';
import Product from './pages/Products.jsx';
import Checkout from './pages/Checkout.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import OrderHistory from './pages/OrderHistory.jsx';
import AccountSettings from './pages/AccountSettings.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Notifications from './pages/Notifications.jsx';
import { auth } from './firebase'; 
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Normalize Firebase user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const token = await currentUser.getIdToken();
        localStorage.setItem('token', token);

        // Ensure displayName and photoURL are always available
        const normalizedUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email.split('@')[0],
          photoURL: currentUser.photoURL || null,
        };

        setUser(normalizedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('token');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    auth.signOut()
      .then(() => {
        setIsAuthenticated(false);
        setUser(null);
        navigate('/');
      })
      .catch((error) => console.error('Sign out error:', error.message));
  };

  const handleSignIn = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    navigate('/');
  };

  return (
    <ErrorBoundary>
      <div>
        <Navbar
          isAuthenticated={isAuthenticated}
          onSignOut={handleSignOut}
          user={user}
        />

        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
            <Route path="/search" element={<Search />} />
            <Route path="/Products" element={<Product />} />
            <Route path="/Cart" element={<Cart />} />
            <Route path="/Checkout" element={<Checkout />} />
            <Route path="/Login" element={<Login onSignIn={handleSignIn} />} />
            <Route path="/ProductDetails/:id" element={<ProductDetails />} />
            <Route path="/register" element={<Register />} />
            <Route path="/VerifyEmail" element={<VerifyEmail />} />
            <Route path="/Dashboard" element={<Dashboard />} />
            <Route path="/OrderHistory" element={<OrderHistory />} />
            <Route path="/AccountSettings" element={<AccountSettings />} />
            <Route path="/Wishlist" element={<Wishlist />} />
            <Route path="/Favorites" element={<Wishlist />} />
            <Route path="/Notifications" element={<Notifications />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

export default App;
