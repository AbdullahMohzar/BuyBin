import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase'; // Adjust path as needed
import './VerifyEmail.css';

function VerifyEmail() {
  const [errors, setErrors] = useState([]);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = new URLSearchParams(location.search).get('email') || ''; // Get email from query

  useEffect(() => {
    const checkVerification = async () => {
      const user = auth.currentUser;
      if (user) {
        await user.reload(); // Refresh user data
        if (user.emailVerified) {
          setIsVerified(true);
          navigate('/Login'); // Redirect to login once verified
        }
      } else {
        setErrors(['No user session found. Please register again.']);
      }
    };

    // Check verification status every 2 seconds
    const interval = setInterval(checkVerification, 2000);
    checkVerification(); // Initial check

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [navigate]);

  const handleResend = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        console.log('Verification email resent'); // Debug log
        setErrors(['A new verification link has been sent to your email.']);
      } else {
        setErrors(['No user session found. Please register again.']);
      }
    } catch (error) {
      console.error('Resend error:', error); // Debug log
      setErrors(['Failed to resend verification email. Please try again.']);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1 className="login-title">Verify Your Email</h1>
        <h2 className="login-subtitle">Check your email at {email}</h2>
        <p>Please click the verification link sent to your email to activate your account.</p>
        <p>
          Didn’t receive the email?{' '}
          <span
            className="resend-link"
            onClick={handleResend}
            style={{ cursor: 'pointer', color: '#40ffaa' }}
          >
            Resend Verification Link
          </span>
        </p>
        {errors.length > 0 && (
          <div className="error-container">
            <ul>
              {errors.map((error, index) => (
                <li key={index} className="error-message">{error}</li>
              ))}
            </ul>
          </div>
        )}
        {isVerified && <p>Verifying... You will be redirected shortly.</p>}
      </div>
    </div>
  );
}

export default VerifyEmail;