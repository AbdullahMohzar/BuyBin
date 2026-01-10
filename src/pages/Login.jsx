import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, analytics, db } from '../firebase'; // Path adjusted for src/pages/Login.jsx
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics'; // For tracking events
import './Login.css';

// Helper function to update or create user document in Firestore on login
const updateUserOnLogin = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Update last login time
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      emailVerified: user.emailVerified,
    });
    console.log('User last login updated in Firestore');
  } else {
    // Create new user document if it doesn't exist (for Google sign-in)
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || null,
      phoneNumber: user.phoneNumber || null,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      emailVerified: user.emailVerified,
      provider: user.providerData?.[0]?.providerId || 'email',
      preferences: {
        theme: 'light',
        notifications: true,
        newsletter: false,
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      orderCount: 0,
      wishlistCount: 0,
      cartCount: 0,
    };
    await setDoc(userRef, userData);
    console.log('User document created in Firestore on login');
  }
};

function Login({ onSignIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Log page view event (optional, requires Analytics)
    if (analytics) {
      logEvent(analytics, 'page_view', { page_title: 'Login Page' });
    }
  }, []);

  const validateForm = () => {
    const newErrors = [];
    if (!username.includes('@')) {
      newErrors.push('Username must contain @');
    }
    if (password.length <= 6) {
      newErrors.push('Password must be more than 6 characters');
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, username, password);
        const token = await userCredential.user.getIdToken();

        // Update user info in Firestore
        await updateUserOnLogin(userCredential.user);

        const response = await fetch('http://localhost:5000/api/auth/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (response.ok) {
          onSignIn(data.token);
          
          // Generate random deals on sign in (runs in background, admin only)
          fetch('http://localhost:5000/api/deals/generate', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ numDeals: 2, minDiscount: 20, maxDiscount: 50 }),
          }).catch(err => console.log('Deals generation skipped:', err.message));
          
          if (analytics) {
            logEvent(analytics, 'login', {
              method: 'email_password',
              email: username,
              success: true,
            });
          }
          navigate('/dashboard'); // Redirect to dashboard
        } else {
          setErrors([data.message || 'Login failed']);
        }
      } catch (error) {
        setErrors([error.message || 'Login failed']);
        if (analytics) {
          logEvent(analytics, 'login', {
            method: 'email_password',
            success: false,
            error_message: error.message,
          });
        }
      }
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const token = await userCredential.user.getIdToken();

      // Update or create user info in Firestore
      await updateUserOnLogin(userCredential.user);

      const response = await fetch('http://localhost:5000/api/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (response.ok) {
        onSignIn(data.token);
        
        // Generate random deals on sign in (runs in background)
        fetch('http://localhost:5000/api/deals/generate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ numDeals: 2, minDiscount: 20, maxDiscount: 50 }),
        }).catch(err => console.log('Deals generation skipped:', err.message));
        
        if (analytics) {
          logEvent(analytics, 'login', {
            method: 'google',
            email: userCredential.user.email,
            success: true,
          });
        }
        navigate('/dashboard'); // Redirect to dashboard
      } else {
        setErrors([data.message || 'Google login failed']);
      }
    } catch (error) {
      setErrors([error.message || 'Google login failed']);
      if (analytics) {
        logEvent(analytics, 'login', {
          method: 'google',
          success: false,
          error_message: error.message,
        });
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1 className="login-title">Welcome Back</h1>
        <h2 className="login-subtitle">Sign In to BuyBin</h2>
        <form className="login-form" onSubmit={handleEmailSubmit}>
          <div className="input-group">
            <input
              className="login-input"
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="off"
            />
            <label htmlFor="username" className="input-label">Username (Email)</label>
          </div>
          <div className="input-group">
            <input
              className="login-input"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="off"
            />
            <label htmlFor="password" className="input-label">Password</label>
          </div>
          <button className="signin-btn" type="submit">Sign In</button>
        </form>
        <div className="google-signin-container">
          <button className="google-signin-btn" onClick={handleGoogleSignIn}>
            <span className="google-icon"></span> Sign in with Google
          </button>
        </div>
        {errors.length > 0 && (
          <div className="error-container">
            <ul>
              {errors.map((error, index) => (
                <li key={index} className="error-message">{error}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="signup-link">
          Don't have an account? <Link to="/register">Join Free</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;