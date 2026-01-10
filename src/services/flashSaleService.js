import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase'; // Your Firebase app instance

// Initialize Firebase Functions
const functions = getFunctions(app);

// Create the callable function reference
const purchaseFlashItemFn = httpsCallable(functions, 'purchaseFlashItem');

/**
 * Purchase a flash sale item
 * @param {string} itemId - The ID of the item to purchase
 * @returns {Promise<Object>} - Success response with orderId
 */
export async function purchaseFlashItem(itemId) {
  try {
    const result = await purchaseFlashItemFn({ itemId });
    
    // Success! Return the order data
    return {
      success: true,
      orderId: result.data.orderId,
      remainingStock: result.data.remainingStock,
      message: result.data.message,
    };

  } catch (error) {
    // Handle specific error codes from Firebase Functions
    const errorCode = error.code;
    const errorMessage = error.message;

    // Handle 'Sold Out' error specifically
    if (errorCode === 'functions/resource-exhausted') {
      return {
        success: false,
        soldOut: true,
        message: 'Sorry, out of stock!',
      };
    }

    // Handle authentication error
    if (errorCode === 'functions/unauthenticated') {
      return {
        success: false,
        requiresAuth: true,
        message: 'Please sign in to purchase.',
      };
    }

    // Handle other errors
    return {
      success: false,
      message: errorMessage || 'Something went wrong. Please try again.',
    };
  }
}

/**
 * Example React component usage:
 * 
 * import { purchaseFlashItem } from '../services/flashSaleService';
 * 
 * const handleBuyNow = async () => {
 *   setLoading(true);
 *   const result = await purchaseFlashItem('iphone15');
 *   setLoading(false);
 * 
 *   if (result.success) {
 *     // Show success popup
 *     alert(`Order confirmed! Order ID: ${result.orderId}`);
 *     navigate('/orders');
 *   } else if (result.soldOut) {
 *     // Show sold out popup
 *     alert('Sorry, out of stock!');
 *   } else if (result.requiresAuth) {
 *     // Redirect to login
 *     navigate('/login');
 *   } else {
 *     // Show generic error
 *     alert(result.message);
 *   }
 * };
 */
