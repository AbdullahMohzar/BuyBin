import { Link, useNavigate } from 'react-router-dom';
// import logo from './assets/Logo2.png'; 
import GradientText from './GradientText.jsx';
import GooeyNav from './GooeyNav.jsx';
import './Navbar.css';
import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FaBell } from 'react-icons/fa';

function Navbar({ isAuthenticated, onSignOut, user }) {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Listen for unread notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setHasUnreadNotifications(false);
      return;
    }

    // Wait for auth state to be ready
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setHasUnreadNotifications(false);
        return;
      }

      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef, 
        where('userId', '==', currentUser.uid),
        where('read', '==', false)
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        setHasUnreadNotifications(!snapshot.empty);
      }, (error) => {
        console.error('Error listening to notifications:', error);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, [isAuthenticated]);

  // Define items based on authentication status
  const gooeyItems = isAuthenticated ? [
    { label: "Home", href: "/Dashboard" },
    { label: "Products", href: "/Products" },
    { label: "Cart", href: "/Cart" },
    { label: "Notifications", href: "/Notifications" },
  ] : [
    { label: "Home", href: "/" },
    { label: "Products", href: "/Products" },
    // { label: "About", href: "/About" },
    // { label: "Contact", href: "/Contact" },
  ];

  // Handle item click
  const handleItemClick = (item) => {
    if (!isAuthenticated && ['Products', 'Cart', 'Notifications'].includes(item.label)) {
      navigate('/Login');
    } else if (item.label === "Sign In") {
      navigate('/Login');
    } else {
      navigate(item.href);
    }
  };

  // Handle sign out with proper redirect
  const handleSignOut = () => {
    setIsDropdownOpen(false);
    onSignOut(); // Call the parent onSignOut to update auth state
    navigate('/'); // Redirect to homepage after sign out
  };

  // Handle logo click
  const handleLogoClick = () => {
    navigate(isAuthenticated ? '/Dashboard' : '/');
  };

  return (
    <div className="modern-navbar">
      {/* Logo Section */}
      <div className="navbar-brand" onClick={handleLogoClick}>
        <div className="logo-container">
          <GradientText
            colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
            animationSpeed={3}
            showBorder={false}
            className="logo-text"
          >
            BuyBin
          </GradientText>
          <div className="logo-tagline">Shop Smart</div>
        </div>
      </div>

      {/* Center Navigation */}
      <nav className="navbar-center">
        <div className="gooey-nav-wrapper">
          <GooeyNav
            items={gooeyItems}
            particleCount={15}
            particleDistances={[90, 10]}
            particleR={100}
            initialActiveIndex={0}
            animationTime={600}
            timeVariance={300}
            colors={[1, 2, 3, 1, 2, 3, 1, 4]}
            onItemClick={handleItemClick}
          />
        </div>
      </nav>

      {/* Right Section */}
      <div className="navbar-actions">
        {!isAuthenticated ? (
          <div className="auth-buttons">
            <Link to="/Login" className="btn-secondary">
              Sign In
            </Link>
            <Link to="/Register" className="btn-primary">
              Get Started
            </Link>
          </div>
        ) : (
          <div className="user-section">
            {/* Notifications Icon */}
            <Link to="/Notifications" className="notification-icon-link">
              <FaBell className="notification-bell" />
              {hasUnreadNotifications && <span className="notification-badge"></span>}
            </Link>

            {/* Profile Dropdown */}
            <div className="profile-section" ref={dropdownRef}>
              <div 
                className="profile-trigger"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="profile-info">
                  <img
                      src={
                        user?.photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=4F46E5&color=fff`
                      }
                      alt="User Avatar"
                      className="profile-avatar"
                    />

                  <div className="profile-text">
                    <span className="profile-name">{user?.displayName || 'User'}</span>
                    <span className="profile-email">{user?.email || 'user@example.com'}</span>
                  </div>
                </div>
                <div className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Enhanced Dropdown */}
              {isDropdownOpen && (
                <div className="profile-dropdown-enhanced">
                  <div className="dropdown-header">
                    <img
                      src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=4F46E5&color=fff`}
                      alt="User Avatar"
                      className="dropdown-avatar"
                    />
                    <div>
                      <div className="dropdown-name">{user?.displayName || 'User'}</div>
                      <div className="dropdown-email">{user?.email || 'user@example.com'}</div>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <div className="dropdown-menu">
                    <Link to="/Dashboard" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15v-4h8v4" />
                      </svg>
                      Dashboard
                    </Link>

                    <Link to="/AccountSettings" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Account Settings
                    </Link>

                    <Link to="/OrderHistory" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Order History
                    </Link>

                    <Link to="/Favorites" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Wishlist
                    </Link>

                    <div className="dropdown-divider"></div>

                    <button className="dropdown-item logout-item" onClick={handleSignOut}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Navbar;