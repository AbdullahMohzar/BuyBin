import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockApi } from './mockApi.js';
import { CartContext } from '../Context/CartContext';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import './ProductDetails.css';

function ProductDetails() {
  const { addToCart } = useContext(CartContext);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistDocId, setWishlistDocId] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const fallbackImage = 'https://placehold.co/400x400?text=Product+Image';
  const relatedListRef = useRef(null);

  // Check if product is in wishlist - with auth state listener
  useEffect(() => {
    if (!id) return;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsInWishlist(false);
        setWishlistDocId(null);
        return;
      }

      try {
        const wishlistRef = collection(db, 'wishlists');
        // Try string ID to match Firestore document IDs
        const q = query(
          wishlistRef,
          where('userId', '==', user.uid),
          where('productId', '==', String(id))
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          setIsInWishlist(true);
          setWishlistDocId(snapshot.docs[0].id);
        } else {
          setIsInWishlist(false);
          setWishlistDocId(null);
        }
      } catch (error) {
        console.error('Error checking wishlist:', error);
      }
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productData = await mockApi.getProductById(id);
        if (!productData) throw new Error(`Product with ID ${id} not found`);

        const imageUrls = [productData.image, ...Array(3).fill().map((_, i) =>
          productData.image || `https://placehold.co/100x100?text=Thumbnail${i + 1}`
        )];

        setProduct({
          id: productData.id,
          title: productData.title || 'Untitled Product',
          price: Number(productData.currentPrice || productData.price || 0),
          originalPrice: Number(productData.originalPrice || productData.price || 0),
          currentPrice: Number(productData.currentPrice || productData.price || 0),
          isDiscounted: productData.isDiscounted || false,
          discountPercent: productData.discountPercent || 0,
          image: imageUrls[0] || fallbackImage,
          images: imageUrls,
          description: productData.description || 'No description available',
          category: productData.category || 'Unknown',
          rating: productData.rating || { rate: 0, count: 0 },
          comments: productData.comments || [],
        });
        setError(null);

        const related = await mockApi.getProductsByCategory(productData.category);
        setRelatedProducts(related.filter(p => p.id !== productData.id));
      } catch (err) {
        setError(`Product with ID ${id} not found or error loading details.`);
      }
    };
    loadProduct();
  }, [id]);

  const showNotificationWithMessage = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleAddToCart = () => {
    if (product) {
      // Pass full product with discounted pricing info
      const productToAdd = {
        ...product,
        price: product.currentPrice || product.price,
        originalPrice: product.originalPrice || product.price,
        currentPrice: product.currentPrice || product.price,
        isDiscounted: product.isDiscounted || false,
        discountPercent: product.discountPercent || 0,
      };
      addToCart(productToAdd, quantity);
      showNotificationWithMessage('Item added to Cart');
    }
  };

  const handleWishlistToggle = async () => {
    const user = auth.currentUser;
    
    if (!user) {
      showNotificationWithMessage('Please sign in to add to wishlist');
      setTimeout(() => navigate('/Login'), 1500);
      return;
    }

    try {
      if (isInWishlist && wishlistDocId) {
        // Remove from wishlist
        await deleteDoc(doc(db, 'wishlists', wishlistDocId));
        setIsInWishlist(false);
        setWishlistDocId(null);
        showNotificationWithMessage('Removed from wishlist');
      } else {
        // Add to wishlist - Check for duplicates first
        const wishlistRef = collection(db, 'wishlists');
        const q = query(
          wishlistRef, 
          where('userId', '==', user.uid), 
          where('productId', '==', product.id)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          // Already exists, just update state
          setIsInWishlist(true);
          setWishlistDocId(snapshot.docs[0].id);
          showNotificationWithMessage('Item already in wishlist ❤️');
          return;
        }

        const docRef = await addDoc(collection(db, 'wishlists'), {
          userId: user.uid,
          productId: String(product.id), // Ensure consistent string type
          title: product.title,
          price: product.currentPrice || product.price,
          originalPrice: product.originalPrice || product.price,
          currentPrice: product.currentPrice || product.price,
          isDiscounted: product.isDiscounted || false,
          discountPercent: product.discountPercent || 0,
          image: product.image,
          category: product.category,
          addedAt: serverTimestamp(),
        });
        setIsInWishlist(true);
        setWishlistDocId(docRef.id);
        showNotificationWithMessage('Added to wishlist ❤️');
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      showNotificationWithMessage(`Error: ${error.message}`);
    }
  };

  const handleThumbnailClick = (imageUrl) => {
    setProduct((prev) => ({ ...prev, image: imageUrl }));
  };

  const handleRatingClick = (rating) => {
    if (!product) return;
    setUserRating(rating);
  };

  const handleCommentSubmit = () => {
    if (!product || !comment.trim()) return;
    const updatedComments = [...(product.comments || []), comment];
    setProduct((prev) => ({ ...prev, comments: updatedComments }));
    setComment('');
  };

  const scrollRelated = (direction) => {
    if (relatedListRef.current) {
      const scrollAmount = 200;
      relatedListRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleQuantityChange = (change) => {
    setQuantity((prev) => Math.max(1, prev + change));
  };

  if (!product && !error) return <div className="product-details-page">Loading...</div>;

  return (
    <div className="product-details-page">
      {showNotification && <div className="notification">{notificationMessage}</div>}
      <div className="product-details-container">
        {error && <div className="error-container"><p>{error}</p></div>}
        {product && (
          <div className="product-details-layout">
            {/* IMAGE SECTION */}
            <div className="product-image-section">
              <img src={product.image} alt={product.title} className="main-product-image" />
              <div className="thumbnail-gallery horizontal">
                {product.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`${product.title} thumbnail ${index + 1}`}
                    className="thumbnail-image"
                    onClick={() => handleThumbnailClick(img)}
                  />
                ))}
              </div>
            </div>

            {/* INFO SECTION */}
            <div className="product-info-section">
              <h2 className="product-title">{product.title}</h2>
              
              {/* Price Section with Discount Support */}
              <div className="product-price-section">
                {product.isDiscounted ? (
                  <>
                    <span className="original-price crossed-out">£{product.originalPrice.toFixed(2)}</span>
                    <span className="current-price discounted">£{product.currentPrice.toFixed(2)}</span>
                    <span className="discount-badge">-{product.discountPercent}% OFF</span>
                  </>
                ) : (
                  <span className="current-price">£{product.price.toFixed(2)}</span>
                )}
              </div>
              
              <p className="product-category">Category: {product.category}</p>

              <div className="product-rating">
                <span>Rating: </span>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star ${star <= (hoverRating || userRating || product.rating.rate) ? 'filled' : ''}`}
                      onClick={() => handleRatingClick(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span>({product.rating.rate} from {product.rating.count} reviews)</span>
              </div>

              <div className="product-actions">
                <div className="quantity-controls">
                  <button
                    className="quantity-btn quantity-decrease"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="quantity-display">{quantity}</span>
                  <button
                    className="quantity-btn quantity-increase"
                    onClick={() => handleQuantityChange(1)}
                  >
                    +
                  </button>
                </div>
                <button className="add-to-cart-btn" onClick={handleAddToCart}>
                  Add to Cart
                </button>
                <button 
                  className={`wishlist-btn ${isInWishlist ? 'active' : ''}`}
                  onClick={handleWishlistToggle}
                  title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  {isInWishlist ? '❤️' : '🤍'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- TABS --- */}
        <div className="tabs">
          <button
            className={activeTab === "description" ? "tab active" : "tab"}
            onClick={() => setActiveTab("description")}
          >
            Description
          </button>
          <button
            className={activeTab === "reviews" ? "tab active" : "tab"}
            onClick={() => setActiveTab("reviews")}
          >
            Reviews
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === "description" && (
          <div className="tab-content">
            <p>{product.description}</p>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="tab-content">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your review..."
              className="comment-input"
            />
            <button className="submit-comment-btn" onClick={handleCommentSubmit} disabled={!comment.trim()}>
              Submit Review
            </button>
            <ul className="comments-list">
              {product.comments.map((c, index) => (
                <li key={index} className="comment-item">{c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* --- RELATED PRODUCTS SLIDER --- */}
        <div className="related-products-section">
          <h3>Related Products</h3>
          <div className="related-slider">
            <button className="slider-btn left" onClick={() => scrollRelated('left')}>‹</button>
            <div className="related-products-list" ref={relatedListRef}>
              {relatedProducts.map((relatedProduct) => (
                <div key={relatedProduct.id} className="related-product-card">
                  <img
                    src={relatedProduct.image || 'https://placehold.co/100x100?text=Product'}
                    alt={relatedProduct.title}
                    className="related-product-image"
                  />
                  <h4 className="related-product-title">{relatedProduct.title}</h4>
                  <div className="related-product-price">
                    {relatedProduct.isDiscounted ? (
                      <>
                        <span className="original-price crossed-out">£{(relatedProduct.originalPrice || relatedProduct.price || 0).toFixed(2)}</span>
                        <span className="current-price discounted">£{(relatedProduct.currentPrice || relatedProduct.price || 0).toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="current-price">£{(relatedProduct.currentPrice || relatedProduct.price || 0).toFixed(2)}</span>
                    )}
                  </div>
                  <Link to={`/ProductDetails/${relatedProduct.id}`} className="view-details-btn">
                    View
                  </Link>
                </div>
              ))}
            </div>
            <button className="slider-btn right" onClick={() => scrollRelated('right')}>›</button>
          </div>
        </div>
      </div>
      {showNotification && (
        <div className="notification">{notificationMessage}</div>
      )}
    </div>
  );
}

export default ProductDetails;