import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeSelector from '../Components/ThemeSelector';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import './AccountSettings.css';

function AccountSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Profile State
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    phone: '',
    photoURL: '',
    address: {
      street: '',
      city: '',
      postcode: '',
      country: 'United Kingdom',
    },
  });

  // Password State
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Preferences State
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    orderUpdates: true,
    promotions: false,
    newsletter: false,
    darkMode: true,
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/Login');
      return;
    }

    loadUserData(user);
  }, [navigate]);

  const loadUserData = async (user) => {
    try {
      // Get additional user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      setProfile({
        displayName: user.displayName || userData.displayName || '',
        email: user.email || '',
        phone: userData.phone || '',
        photoURL: user.photoURL || userData.photoURL || '',
        address: userData.address || {
          street: '',
          city: '',
          postcode: '',
          country: 'United Kingdom',
        },
      });

      setPreferences(userData.preferences || {
        emailNotifications: true,
        orderUpdates: true,
        promotions: false,
        newsletter: false,
        darkMode: true,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProfileSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: profile.displayName,
        photoURL: profile.photoURL,
      });

      // Update Firestore user document
      await setDoc(doc(db, 'users', user.uid), {
        displayName: profile.displayName,
        email: profile.email,
        phone: profile.phone,
        photoURL: profile.photoURL,
        address: profile.address,
        updatedAt: new Date(),
      }, { merge: true });

      showMessage('success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      showMessage('error', `Failed to update profile: ${error.message}`);
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (passwords.new !== passwords.confirm) {
      showMessage('error', 'New passwords do not match.');
      return;
    }

    if (passwords.new.length < 6) {
      showMessage('error', 'Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, passwords.new);
      
      setPasswords({ current: '', new: '', confirm: '' });
      showMessage('success', 'Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        showMessage('error', 'Current password is incorrect.');
      } else {
        showMessage('error', 'Failed to change password. Please try again.');
      }
    }
    setSaving(false);
  };

  const handlePreferencesSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferences: preferences,
        updatedAt: new Date(),
      });
      showMessage('success', 'Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      showMessage('error', 'Failed to save preferences. Please try again.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="account-settings-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1>Account Settings</h1>
          <p className="subtitle">Manage your profile and preferences</p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === 'success' ? '✓' : '⚠'} {message.text}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="settings-nav">
          <button
            className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="tab-icon">👤</span>
            Profile
          </button>
          <button
            className={`nav-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <span className="tab-icon">🔒</span>
            Security
          </button>
          <button
            className={`nav-tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <span className="tab-icon">⚙️</span>
            Preferences
          </button>
          <button
            className={`nav-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <span className="tab-icon">🎨</span>
            Appearance
          </button>
          <button
            className={`nav-tab ${activeTab === 'address' ? 'active' : ''}`}
            onClick={() => setActiveTab('address')}
          >
            <span className="tab-icon">📍</span>
            Address
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="settings-section">
            <h2>Personal Information</h2>
            <div className="profile-photo-section">
              <img
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'User')}&background=667eea&color=fff&size=128`}
                alt="Profile"
                className="profile-photo"
              />
              <div className="photo-actions">
                <input
                  type="text"
                  placeholder="Enter photo URL"
                  value={profile.photoURL}
                  onChange={(e) => setProfile({ ...profile, photoURL: e.target.value })}
                  className="photo-url-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="Enter your name"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="disabled-input"
              />
              <span className="input-hint">Email cannot be changed</span>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+44 7XXX XXXXXX"
              />
            </div>

            <button className="save-btn" onClick={handleProfileSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="settings-section">
            <h2>Change Password</h2>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                placeholder="Enter current password"
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                placeholder="Enter new password"
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>

            <button className="save-btn" onClick={handlePasswordChange} disabled={saving}>
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="settings-section">
            <h2>Notification Preferences</h2>
            
            <div className="toggle-group">
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-label">Email Notifications</span>
                  <span className="toggle-description">Receive important updates via email</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-label">Order Updates</span>
                  <span className="toggle-description">Get notified about order status changes</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.orderUpdates}
                    onChange={(e) => setPreferences({ ...preferences, orderUpdates: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-label">Promotional Emails</span>
                  <span className="toggle-description">Receive deals and promotional offers</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.promotions}
                    onChange={(e) => setPreferences({ ...preferences, promotions: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-label">Newsletter</span>
                  <span className="toggle-description">Weekly newsletter with trending products</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.newsletter}
                    onChange={(e) => setPreferences({ ...preferences, newsletter: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <button className="save-btn" onClick={handlePreferencesSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="settings-section">
            <h2>Appearance Settings</h2>
            <p className="section-description">Customize the look and feel of the application.</p>
            <ThemeSelector />
          </div>
        )}

        {/* Address Tab */}
        {activeTab === 'address' && (
          <div className="settings-section">
            <h2>Delivery Address</h2>
            
            <div className="form-group">
              <label>Street Address</label>
              <input
                type="text"
                value={profile.address.street}
                onChange={(e) => setProfile({
                  ...profile,
                  address: { ...profile.address, street: e.target.value }
                })}
                placeholder="123 Main Street"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={profile.address.city}
                  onChange={(e) => setProfile({
                    ...profile,
                    address: { ...profile.address, city: e.target.value }
                  })}
                  placeholder="London"
                />
              </div>

              <div className="form-group">
                <label>Postcode</label>
                <input
                  type="text"
                  value={profile.address.postcode}
                  onChange={(e) => setProfile({
                    ...profile,
                    address: { ...profile.address, postcode: e.target.value }
                  })}
                  placeholder="SW1A 1AA"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Country</label>
              <select
                value={profile.address.country}
                onChange={(e) => setProfile({
                  ...profile,
                  address: { ...profile.address, country: e.target.value }
                })}
              >
                <option value="United Kingdom">United Kingdom</option>
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
              </select>
            </div>

            <button className="save-btn" onClick={handleProfileSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountSettings;
