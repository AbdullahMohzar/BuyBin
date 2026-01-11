import { createContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export const CartContext = createContext();

const CART_STORAGE_KEY = 'buybin_cart';
const API_BASE_URL = 'http://localhost:5000';

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [shippingCost, setShippingCost] = useState(5.0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [firebaseToken, setFirebaseToken] = useState(null);

  // Load cart from localStorage (for guests)
  const loadLocalCart = useCallback(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        return parsed.cartItems || [];
      }
    } catch (error) {
      console.error('Error loading local cart:', error);
    }
    return [];
  }, []);

  // Save cart to localStorage
  const saveLocalCart = useCallback((items) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ cartItems: items }));
    } catch (error) {
      console.error('Error saving local cart:', error);
    }
  }, []);

  // Load cart from Redis (for logged-in users)
  const loadServerCart = useCallback(async (userId) => {
    try {
      if (!firebaseToken) return [];

      const response = await fetch(`${API_BASE_URL}/api/cart/${userId}`, {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data.cartItems || [];
      }
    } catch (error) {
      console.error('Error loading server cart:', error);
    }
    return [];
  }, [firebaseToken]);

  // Save cart to Redis
  const saveServerCart = useCallback(async (userId, items) => {
    try {
      if (!firebaseToken) return;

      await fetch(`${API_BASE_URL}/api/cart/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ userId, cartItems: items }),
      });
    } catch (error) {
      console.error('Error saving server cart:', error);
    }
  }, [firebaseToken]);

  // Merge local cart with server cart on login
  const mergeCarts = useCallback((localCart, serverCart) => {
    const merged = [...serverCart];
    
    localCart.forEach(localItem => {
      const existingIndex = merged.findIndex(item => item.id === localItem.id);
      if (existingIndex >= 0) {
        // Update quantity if item exists
        merged[existingIndex].quantity += localItem.quantity;
      } else {
        // Add new item
        merged.push(localItem);
      }
    });
    
    return merged;
  }, []);

  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      
      if (user) {
        // User logged in
        setCurrentUserId(user.uid);
        try {
          const token = await user.getIdToken();
          setFirebaseToken(token);
        } catch (error) {
          console.error('Error getting Firebase token:', error);
          setFirebaseToken(null);
        }
        
        // Load local and server carts
        const localCart = loadLocalCart();
        const serverCart = await loadServerCart(user.uid);
        
        // Merge carts if local cart has items
        if (localCart.length > 0) {
          const mergedCart = mergeCarts(localCart, serverCart);
          setCartItems(mergedCart);
          
          // Save merged cart to server
          await saveServerCart(user.uid, mergedCart);
          
          // Clear local cart after merge
          localStorage.removeItem(CART_STORAGE_KEY);
        } else {
          setCartItems(serverCart);
        }
      } else {
        // User logged out - load from localStorage
        setCurrentUserId(null);
        setFirebaseToken(null);
        const localCart = loadLocalCart();
        setCartItems(localCart);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [loadLocalCart, loadServerCart, mergeCarts, saveServerCart]);

  // Save cart whenever it changes
  useEffect(() => {
    if (isLoading) return;
    
    if (currentUserId) {
      // Save to server for logged-in users
      saveServerCart(currentUserId, cartItems);
    } else {
      // Save to localStorage for guests
      saveLocalCart(cartItems);
    }
  }, [cartItems, currentUserId, isLoading, saveServerCart, saveLocalCart]);

  // Add item to cart with default quantity of 1
  const addToCart = (product, quantity = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { ...product, quantity }];
    });
  };

  // Update quantity of an item
  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Remove item from cart
  const removeItem = (id) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  // Clear entire cart
  const clearCart = async () => {
    setCartItems([]);
    setDiscount(0);
    setShippingCost(5.0);
    
    // Clear from storage
    if (currentUserId) {
      try {
        if (firebaseToken) {
          await fetch(`${API_BASE_URL}/api/cart/${currentUserId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${firebaseToken}`,
            },
          });
        }
      } catch (error) {
        console.error('Error clearing server cart:', error);
      }
    }
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      addToCart, 
      updateQuantity, 
      removeItem, 
      clearCart, 
      discount, 
      setDiscount, 
      shippingCost, 
      setShippingCost,
      isLoading,
    }}>
      {children}
    </CartContext.Provider>
  );
}