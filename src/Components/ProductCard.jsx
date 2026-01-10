import { useState } from "react";
import "./ProductCard.css";

function FlipCard({ frontContent, backContent, className = "", onClick }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (onClick) onClick();
  };

  return (
    <div
      className={`flip-card-container ${className}`}
      onClick={handleFlip}
    >
      <div className={`flip-card-inner ${isFlipped ? "flipped" : ""}`}>
        <div className="flip-card-front">
          {frontContent}
        </div>
        <div className="flip-card-back">
          {backContent}
        </div>
      </div>
    </div>
  );
}

export default function FlippingProductCard() {
  return (
    <div className="demo-wrapper">
      <FlipCard
        frontContent={
          <div className="card-content">
            <img
              src="https://images.unsplash.com/photo-1542291026-7eec264c27ff"
              alt="Product"
              className="card-image"
            />
            <h2 className="card-title">Nike Shoes</h2>
            <p className="card-price">$199.99</p>
          </div>
        }
        backContent={
          <div className="card-content">
            <h3 className="card-subtitle">Product Details</h3>
            <p className="card-description">
              Premium comfort with innovative design. Perfect for both casual
              wear and sports activities.
            </p>
            <button className="add-to-cart-btn">Add to Cart</button>
          </div>
        }
      />
    </div>
  );
}
