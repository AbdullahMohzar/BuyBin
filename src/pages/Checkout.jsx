import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../Context/CartContext';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import './Checkout.css';

function Checkout() {
  const { cartItems, clearCart, discount, shippingCost } = useContext(CartContext);
  const navigate = useNavigate();

  const [selectedPayment, setSelectedPayment] = useState('creditCard');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment
  
  const [shippingDetails, setShippingDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
    country: 'United Kingdom'
  });

  // Calculate totals using currentPrice (discounted price)
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.currentPrice || item.price;
    return sum + price * item.quantity;
  }, 0);
  const discountedTotal = subtotal * (1 - discount / 100);
  const finalTotal = discountedTotal + shippingCost;

  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const address = data.address || {};
            setShippingDetails(prev => ({
              ...prev,
              fullName: user.displayName || data.displayName || '',
              email: user.email || '',
              phone: data.phone || '',
              address: address.street || '',
              city: address.city || '',
              postcode: address.postcode || '',
              country: address.country || 'United Kingdom'
            }));
          } else {
             // Fallback to auth details if no firestore doc
             setShippingDetails(prev => ({
               ...prev,
               fullName: user.displayName || '',
               email: user.email || ''
             }));
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      }
    };
    
    fetchUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContinueToPayment = () => {
    // Basic validation
    if (!shippingDetails.fullName || !shippingDetails.address || !shippingDetails.city || !shippingDetails.postcode) {
      alert('Please fill in all required shipping fields.');
      return;
    }
    setStep(2);
  };

  const handleCheckout = async () => {
    const user = auth.currentUser;
    
    if (!user) {
      alert('Please sign in to complete your purchase.');
      navigate('/Login');
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty!');
      navigate('/Products');
      return;
    }

    setProcessing(true);

    try {
      // Create order in Firestore
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        items: cartItems.map(item => ({
          productId: item.id,
          title: item.title,
          price: item.currentPrice || item.price,
          originalPrice: item.originalPrice || item.price,
          currentPrice: item.currentPrice || item.price,
          isDiscounted: item.isDiscounted || false,
          discountPercent: item.discountPercent || 0,
          quantity: item.quantity,
          image: item.image || null,
          category: item.category || null,
        })),
        shippingDetails: shippingDetails,
        subtotal: subtotal,
        discount: discount,
        discountAmount: subtotal * (discount / 100),
        shippingCost: shippingCost,
        total: finalTotal,
        paymentMethod: selectedPayment,
        status: 'confirmed',
        createdAt: serverTimestamp(),
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      console.log('Order created with ID:', orderRef.id);
      
      clearCart();
      alert(`🎉 Order placed successfully!\nOrder ID: ${orderRef.id.slice(-8).toUpperCase()}\nTotal: £${finalTotal.toFixed(2)}`);
      navigate('/OrderHistory');
    } catch (error) {
      console.error('Error creating order:', error);
      alert(`Failed to process order: ${error.message}`);
    }

    setProcessing(false);
  };

  // Debug to catch errors
  if (!cartItems) {
    console.error("Cart items are undefined. Check CartContext setup.");
    return <div>Error: Cart data unavailable</div>;
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h2 className="checkout-title">Checkout</h2>

        {/* Steps Indicator */}
        <div className="checkout-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Shipping</div>
          <div className="step-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Payment</div>
        </div>
        
        {step === 1 ? (
          <div className="shipping-form-section">
            <h3>Shipping Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input 
                  type="text" 
                  name="fullName" 
                  value={shippingDetails.fullName} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input 
                  type="email" 
                  name="email" 
                  value={shippingDetails.email} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label>Address *</label>
              <input 
                type="text" 
                name="address" 
                value={shippingDetails.address} 
                onChange={handleInputChange}
                required 
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input 
                  type="text" 
                  name="city" 
                  value={shippingDetails.city} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Postcode *</label>
                <input 
                  type="text" 
                  name="postcode" 
                  value={shippingDetails.postcode} 
                  onChange={handleInputChange}
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input 
                type="tel" 
                name="phone" 
                value={shippingDetails.phone} 
                onChange={handleInputChange} 
              />
            </div>
            
            <div className="checkout-actions">
              <button className="checkout-btn" onClick={handleContinueToPayment}>
                Continue to Payment <span className="checkout-arrow">→</span>
              </button>
              <button className="back-btn" onClick={() => navigate('/Cart')}>
                Back to Cart
              </button>
            </div>
          </div>
        ) : (
          <div className="payment-section">
            {/* Order Items Summary */}
            {cartItems.length > 0 && (
              <div className="order-items-summary">
                <h3>Order Summary</h3>
                {cartItems.map((item, index) => (
                  <div key={index} className="order-item-row">
                    <img src={item.image || 'https://placehold.co/50x50?text=Item'} alt={item.title} />
                    <div className="item-info">
                      <span className="item-name">{item.title?.substring(0, 30)}...</span>
                      <span className="item-qty">Qty: {item.quantity}</span>
                    </div>
                    <div className="item-price-info">
                      {item.isDiscounted ? (
                        <>
                          <span className="original-price crossed-out">£{(item.originalPrice * item.quantity).toFixed(2)}</span>
                          <span className="item-price discounted">£{((item.currentPrice || item.price) * item.quantity).toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="item-price">£{((item.currentPrice || item.price) * item.quantity).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="checkout-breakdown">
              <div className="breakdown-row">
                <span>Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              <div className="checkout-breakdown-row">
                <span>Shipping</span>
                <span>£{shippingCost.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="breakdown-row discount-row">
                  <span>Discount ({discount}%)</span>
                  <span className="discount-amount">-£{(subtotal * (discount / 100)).toFixed(2)}</span>
                </div>
              )}
              <div className="breakdown-row total-row">
                <span className="total-label">Total</span>
                <span className="final-total">£{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="payment-methods">
              <h3 className="payment-title">Select Payment Method</h3>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="creditCard"
                  checked={selectedPayment === 'creditCard'}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                <span className="payment-label">Credit/Debit Card</span>
                <span className="payment-icon">💳</span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="paypal"
                  checked={selectedPayment === 'paypal'}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                <span className="payment-label">PayPal</span>
                <span className="payment-icon">💸</span>
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="bankTransfer"
                  checked={selectedPayment === 'bankTransfer'}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                <span className="payment-label">Bank Transfer</span>
                <span className="payment-icon">🏦</span>
              </label>
            </div>

            <div className="checkout-actions">
              <button 
                className="checkout-btn" 
                onClick={handleCheckout}
                disabled={processing || cartItems.length === 0}
              >
                <span className="checkout-text">
                  {processing ? 'Processing...' : 'Complete Purchase'}
                </span>
                <span className="checkout-arrow">→</span>
              </button>
              <button className="back-btn" onClick={() => setStep(1)}>
                <span className="back-arrow">←</span>
                Back to Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Checkout;