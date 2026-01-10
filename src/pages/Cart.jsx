import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../Context/CartContext";
import "./Cart.css";

function Cart() {
  const { cartItems, updateQuantity, removeItem, discount, setDiscount, shippingCost, setShippingCost } = useContext(CartContext);
  const navigate = useNavigate();

  // Calculate total price using currentPrice (discounted) and item count
  const subtotal = cartItems.reduce((total, item) => {
    const price = item.currentPrice || item.price;
    return total + price * item.quantity;
  }, 0);
  const itemCount = cartItems.length;

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Apply promo code with enhanced feedback
  const applyPromoCode = () => {
    setErrorMessage("");
    setSuccessMessage("");
    
    if (promoCode.toUpperCase() === "SAVE10") {
      setDiscount(10);
      setSuccessMessage("🎉 10% discount applied!");
    } else if (promoCode.toUpperCase() === "WELCOME20") {
      setDiscount(20);
      setSuccessMessage("🎉 Welcome! 20% discount applied!");
    } else {
      setDiscount(0);
      setErrorMessage('Invalid promo code. Try "SAVE10" or "WELCOME20"');
    }
  };

  const discountedTotal = subtotal * (1 - discount / 100);
  const finalTotal = discountedTotal + shippingCost;

  // Navigate handlers
  const handleContinueShopping = () => navigate("/Products");
  const handleCheckout = () => navigate("/Checkout");

  // Debug to catch errors
  if (!cartItems) {
    console.error("Cart items are undefined. Check CartContext setup.");
    return <div>Error: Cart data unavailable</div>;
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        {/* Cart Items Section */}
        <div className="cart-items-section">
          <div className="cart-header">
            <div className="cart-title-wrapper">
              <h2 className="cart-title">Shopping Cart</h2>
              <div className="cart-badge">
                <span className="item-count">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
              </div>
            </div>
          </div>

          {/* Table headers - only show if items exist */}
          {cartItems.length > 0 && (
            <div className="cart-table-header">
              <span className="header-product">Product</span>
              <span className="header-quantity">Quantity</span>
              <span className="header-price">Price</span>
              <span className="header-total">Total</span>
            </div>
          )}

          {/* Cart Items */}
          <div className="cart-table">
            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">🛍️</div>
                <h3>Your cart is empty</h3>
                <p>Looks like you haven't added any items yet</p>
                <button className="shop-now-btn" onClick={handleContinueShopping}>
                  Start Shopping
                </button>
              </div>
            ) : (
              cartItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="cart-row"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="product-details">
                    <div className="product-image-wrapper">
                      <img
                        src={item.image || "https://placehold.co/80x80?text=No+Image"}
                        alt={item.title}
                        className="product-thumbnail"
                      />
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{item.title.substring(0, 20) + "..."}</h3>
                      <p className="product-subtitle">{item.category || "General"}</p>
                      <button
                        className="remove-btn"
                        onClick={() => removeItem(item.id)}
                        aria-label="Remove item"
                      >
                        <span className="remove-icon">🗑️</span>
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="quantity-section">
                    <div className="quantity-controls">
                      <button
                        className="quantity-btn quantity-decrease"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="quantity-display">{item.quantity}</span>
                      <button
                        className="quantity-btn quantity-increase"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="price-section">
                    {item.isDiscounted ? (
                      <div className="price-with-discount">
                        <span className="original-price crossed-out">£{item.originalPrice?.toFixed(2)}</span>
                        <span className="price discounted">£{(item.currentPrice || item.price).toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="price">£{(item.currentPrice || item.price).toFixed(2)}</span>
                    )}
                  </div>

                  <div className="total-section">
                    <span className="item-total">£{((item.currentPrice || item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Continue shopping */}
          {cartItems.length > 0 && (
            <button className="continue-shopping" onClick={handleContinueShopping}>
              <span className="continue-arrow">←</span>
              Continue Shopping
            </button>
          )}
        </div>

        {/* Order Summary */}
        {cartItems.length > 0 && (
          <div className="order-summary-section">
            <div className="order-summary-card">
              <h2 className="order-title">Order Summary</h2>
              
              <div className="order-breakdown">
                <div className="breakdown-row">
                  <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                  <span>£{subtotal.toFixed(2)}</span>
                </div>

                <div className="breakdown-row shipping-row">
                  <span>Shipping</span>
                  <select
                    className="shipping-select"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(parseFloat(e.target.value))}
                  >
                    <option value={5.0}>Standard (3-5 days) – £5.00</option>
                    <option value={10.0}>Express (1-2 days) – £10.00</option>
                    <option value={0.0}>Free (7-10 days) – £0.00</option>
                  </select>
                </div>

                {discount > 0 && (
                  <div className="breakdown-row discount-row">
                    <span>Discount ({discount}%)</span>
                    <span className="discount-amount">-£{(subtotal * (discount / 100)).toFixed(2)}</span>
                  </div>
                )}

                <div className="promo-section">
                  <div className="promo-input-group">
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="promo-input"
                    />
                    <button 
                      className="apply-btn" 
                      onClick={applyPromoCode}
                      disabled={!promoCode.trim()}
                    >
                      Apply
                    </button>
                  </div>
                  
                  {errorMessage && (
                    <div className="message error-message">
                      <span className="message-icon">❌</span>
                      {errorMessage}
                    </div>
                  )}
                  
                  {successMessage && (
                    <div className="message success-message">
                      <span className="message-icon">✅</span>
                      {successMessage}
                    </div>
                  )}
                </div>
              </div>

              <div className="total-section-summary">
                <div className="total-row">
                  <span className="total-label">Total</span>
                  <span className="final-total">£{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button className="checkout-btn" onClick={handleCheckout}>
                <span className="checkout-text">Proceed to Checkout</span>
                <span className="checkout-arrow">→</span>
              </button>

              <div className="security-badges">
                <div className="badge">🔒 Secure Checkout</div>
                <div className="badge">✅ 30-Day Returns</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;