import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create or update user document in Firestore
  const createUserDocument = async (user, additionalData = {}) => {
    if (!user) return null;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create new user document
      const newUserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || additionalData.username || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || null,
        phoneNumber: user.phoneNumber || additionalData.mobile || null,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        emailVerified: user.emailVerified,
        provider: user.providerData?.[0]?.providerId || 'email',
        // User preferences
        preferences: {
          theme: 'light',
          notifications: true,
          newsletter: false,
        },
        // Shipping address (to be filled later)
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        },
        // Order history reference
        orderCount: 0,
        wishlistCount: 0,
        cartCount: 0,
        ...additionalData,
      };

      try {
        await setDoc(userRef, newUserData);
        console.log('User document created in Firestore');
        return newUserData;
      } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
      }
    } else {
      // Update existing user's last login
      try {
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          emailVerified: user.emailVerified,
        });
        console.log('User document updated in Firestore');
        return userSnap.data();
      } catch (error) {
        console.error('Error updating user document:', error);
        throw error;
      }
    }
  };

  // Fetch user data from Firestore
  const fetchUserData = async (uid) => {
    if (!uid) return null;
    
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Update user profile in Firestore
  const updateUserProfile = async (updates) => {
    if (!auth.currentUser) return null;
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      // Refresh local user data
      const updatedData = await fetchUserData(auth.currentUser.uid);
      setUserData(updatedData);
      return updatedData;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  // Update user address
  const updateUserAddress = async (address) => {
    return updateUserProfile({ address });
  };

  // Update user preferences
  const updateUserPreferences = async (preferences) => {
    return updateUserProfile({ preferences });
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          // Fetch or create user document
          let data = await fetchUserData(user.uid);
          if (!data) {
            data = await createUserDocument(user);
          }
          setUserData(data);
        } catch (error) {
          console.error('Error in auth state change:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    userData,
    loading,
    createUserDocument,
    fetchUserData,
    updateUserProfile,
    updateUserAddress,
    updateUserPreferences,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
