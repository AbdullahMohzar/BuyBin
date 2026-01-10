import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../firebase'; // Adjust path as needed
import { createUserWithEmailAndPassword, signInWithPopup, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics'; // If using analytics
import './Register.css';

// Helper function to create user document in Firestore
const createUserInFirestore = async (user, additionalData = {}) => {
  const userRef = doc(db, 'users', user.uid);
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: additionalData.username || user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL || null,
    phoneNumber: additionalData.mobile || user.phoneNumber || null,
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
  console.log('User document created in Firestore');
  return userData;
};

function Register() {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState([]);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = [];
    if (!email.includes('@') || !email.endsWith('.com')) {
      newErrors.push('Please enter a valid email address');
    }
    if (!/^\+?[1-9]\d{9,14}$/.test(mobile)) {
      newErrors.push('Please enter a valid mobile number (e.g., +1234567890)');
    }
    if (!username.trim()) {
      newErrors.push('Username is required');
    }
    if (password.length <= 6) {
      newErrors.push('Password must be more than 6 characters');
    }
    if (password !== confirmPassword) {
      newErrors.push('Passwords do not match');
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User created:', userCredential.user); // Debug log
        
        // Update the user's display name in Firebase Auth
        await updateProfile(userCredential.user, {
          displayName: username,
        });
        
        // Store user info in Firestore
        await createUserInFirestore(userCredential.user, {
          username,
          mobile,
        });
        console.log('User data stored in Firestore'); // Debug log
        
        await sendEmailVerification(userCredential.user);
        console.log('Verification email sent'); // Debug log
        navigate(`/VerifyEmail?email=${encodeURIComponent(email)}`);
      } catch (error) {
        console.error('Registration error:', error); // Debug log
        setErrors([error.message || 'Registration failed']);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      console.log('Google user credential:', userCredential.user); // Debug log
      
      // Store user info in Firestore for Google sign-in
      await createUserInFirestore(userCredential.user, {
        username: userCredential.user.displayName,
      });
      console.log('Google user data stored in Firestore'); // Debug log
      
      const token = await userCredential.user.getIdToken();
      console.log('Google ID Token:', token); // Debug log

      // Optionally verify with backend if needed
      const response = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      console.log('Google backend response:', data); // Debug log
      if (response.ok) {
        localStorage.setItem('token', data.token); // Store token if backend provides one
        navigate('/'); // Redirect to home
      } else {
        setErrors([data.message || 'Google registration failed']);
      }
    } catch (error) {
      console.error('Google Sign-In error:', error); // Debug log
      setErrors([error.message || 'Google Sign-In failed']);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1 className="login-title">Create Account</h1>
        <h2 className="login-subtitle">Join BuyBin Today</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              className="login-input"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
            <label htmlFor="email" className="input-label">Email (for verification)</label>
          </div>
          <div className="input-group">
            <input
              className="login-input"
              type="tel"
              id="mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              autoComplete="off"
            />
            <label htmlFor="mobile" className="input-label">Mobile Number (for verification)</label>
          </div>
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
            <label htmlFor="username" className="input-label">Username</label>
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
          <div className="input-group">
            <input
              className="login-input"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="off"
            />
            <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
          </div>
          <button className="signin-btn" type="submit">Sign Up</button>
        </form>
        <div className="google-signin-container">
          <button className="google-signin-btn" onClick={handleGoogleSignIn}>
            <span className="google-icon"></span> Sign up with Google
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
          Already have an account? <Link to="/Login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;