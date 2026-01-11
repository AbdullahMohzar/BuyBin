import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockApi } from './mockApi.js';
import { CartContext } from '../Context/CartContext';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, updateDoc, getDoc } from 'firebase/firestore';
import './ProductDetails.css';

function ProductDetails() {
  const { addToCart } = useContext(CartContext);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [userReviewId, setUserReviewId] = useState(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
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

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Load reviews from Firestore
  useEffect(() => {
    if (!id) return;

    const loadReviews = async () => {
      try {
        const reviewsRef = collection(db, 'reviews');
        
        // First try with ordering (requires composite index)
        let snapshot;
        try {
          const q = query(
            reviewsRef,
            where('productId', '==', String(id)),
            orderBy('createdAt', 'desc')
          );
          snapshot = await getDocs(q);
        } catch (indexError) {
          // If index doesn't exist, fall back to simple query without ordering
          console.warn('Composite index not ready, using simple query:', indexError.message);
          const simpleQuery = query(
            reviewsRef,
            where('productId', '==', String(id))
          );
          snapshot = await getDocs(simpleQuery);
        }
        
        let reviewsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        
        // Sort by createdAt if we used the simple query
        reviewsData.sort((a, b) => b.createdAt - a.createdAt);
        
        setReviews(reviewsData);
        
        // Calculate average rating
        if (reviewsData.length > 0) {
          const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating(totalRating / reviewsData.length);
          setReviewCount(reviewsData.length);
        } else {
          setAverageRating(0);
          setReviewCount(0);
        }

        // Check if current user has already reviewed
        if (currentUser) {
          const userReview = reviewsData.find(review => review.userId === currentUser.uid);
          if (userReview) {
            setUserHasReviewed(true);
            setUserReviewId(userReview.id);
            setUserRating(userReview.rating);
            setComment(userReview.comment || '');
          } else {
            setUserHasReviewed(false);
            setUserReviewId(null);
            setUserRating(0);
          }
        }
      } catch (error) {
        console.error('Error loading reviews:', error);
      }
    };

    loadReviews();
  }, [id, currentUser]);

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
    if (!currentUser) {
      showNotificationWithMessage('Please sign in to rate this product');
      return;
    }
    setUserRating(rating);
  };

  // Submit review to Firestore
  const handleReviewSubmit = async () => {
    if (!product || !currentUser) {
      showNotificationWithMessage('Please sign in to submit a review');
      return;
    }

    if (userRating === 0) {
      showNotificationWithMessage('Please select a rating');
      return;
    }

    setIsSubmittingReview(true);

    try {
      const reviewData = {
        productId: String(product.id),
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        userEmail: currentUser.email,
        rating: userRating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (userHasReviewed && userReviewId) {
        // Update existing review
        await updateDoc(doc(db, 'reviews', userReviewId), {
          rating: userRating,
          comment: comment.trim(),
          updatedAt: serverTimestamp(),
        });
        showNotificationWithMessage('Review updated successfully! ⭐');
      } else {
        // Add new review
        const docRef = await addDoc(collection(db, 'reviews'), reviewData);
        setUserReviewId(docRef.id);
        setUserHasReviewed(true);
        showNotificationWithMessage('Review submitted successfully! ⭐');
      }

      // Refresh reviews with fallback for missing index
      const reviewsRef = collection(db, 'reviews');
      let snapshot;
      try {
        const q = query(
          reviewsRef,
          where('productId', '==', String(product.id)),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(q);
      } catch (indexError) {
        const simpleQuery = query(
          reviewsRef,
          where('productId', '==', String(product.id))
        );
        snapshot = await getDocs(simpleQuery);
      }
      
      let reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      
      reviewsData.sort((a, b) => b.createdAt - a.createdAt);
      setReviews(reviewsData);
      
      // Update average rating
      if (reviewsData.length > 0) {
        const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        setAverageRating(totalRating / reviewsData.length);
        setReviewCount(reviewsData.length);
      }

      setComment('');
    } catch (error) {
      console.error('Error submitting review:', error);
      showNotificationWithMessage('Error submitting review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Delete user's review
  const handleDeleteReview = async () => {
    if (!userReviewId) return;

    try {
      await deleteDoc(doc(db, 'reviews', userReviewId));
      setUserHasReviewed(false);
      setUserReviewId(null);
      setUserRating(0);
      setComment('');
      
      // Refresh reviews with fallback for missing index
      const reviewsRef = collection(db, 'reviews');
      let snapshot;
      try {
        const q = query(
          reviewsRef,
          where('productId', '==', String(product.id)),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(q);
      } catch (indexError) {
        const simpleQuery = query(
          reviewsRef,
          where('productId', '==', String(product.id))
        );
        snapshot = await getDocs(simpleQuery);
      }
      
      let reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      
      reviewsData.sort((a, b) => b.createdAt - a.createdAt);
      setReviews(reviewsData);
      
      // Update average rating
      if (reviewsData.length > 0) {
        const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        setAverageRating(totalRating / reviewsData.length);
        setReviewCount(reviewsData.length);
      } else {
        setAverageRating(0);
        setReviewCount(0);
      }

      showNotificationWithMessage('Review deleted');
    } catch (error) {
      console.error('Error deleting review:', error);
      showNotificationWithMessage('Error deleting review');
    }
  };

  const handleCommentSubmit = () => {
    handleReviewSubmit();
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
                <div className="star-rating display-only">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star ${star <= Math.round(averageRating) ? 'filled' : ''}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span>({averageRating.toFixed(1)} from {reviewCount} reviews)</span>
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
          <div className="tab-content reviews-tab">
            {/* Write Review Section */}
            <div className="write-review-section">
              <h3>{userHasReviewed ? 'Update Your Review' : 'Write a Review'}</h3>
              
              {!currentUser ? (
                <p className="login-prompt">
                  Please <Link to="/Login">sign in</Link> to leave a review.
                </p>
              ) : (
                <>
                  <div className="rating-input">
                    <span>Your Rating: </span>
                    <div className="star-rating interactive">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`star ${star <= (hoverRating || userRating) ? 'filled' : ''}`}
                          onClick={() => handleRatingClick(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    {userRating > 0 && <span className="rating-text">{userRating}/5</span>}
                  </div>
                  
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with this product... (optional)"
                    className="comment-input"
                    rows={4}
                  />
                  
                  <div className="review-actions">
                    <button 
                      className="submit-comment-btn" 
                      onClick={handleReviewSubmit} 
                      disabled={userRating === 0 || isSubmittingReview}
                    >
                      {isSubmittingReview ? 'Submitting...' : (userHasReviewed ? 'Update Review' : 'Submit Review')}
                    </button>
                    
                    {userHasReviewed && (
                      <button 
                        className="delete-review-btn" 
                        onClick={handleDeleteReview}
                      >
                        Delete Review
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Reviews List */}
            <div className="reviews-list-section">
              <h3>Customer Reviews ({reviewCount})</h3>
              
              {/* Rating Summary */}
              {reviewCount > 0 && (
                <div className="rating-summary">
                  <div className="average-rating-display">
                    <span className="big-rating">{averageRating.toFixed(1)}</span>
                    <div className="rating-details">
                      <div className="star-rating display-only">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`star ${star <= Math.round(averageRating) ? 'filled' : ''}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span>Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="no-reviews">No reviews yet. Be the first to review this product!</p>
              ) : (
                <ul className="reviews-list">
                  {reviews.map((review) => (
                    <li key={review.id} className="review-item">
                      <div className="review-header">
                        <div className="reviewer-info">
                          <span className="reviewer-avatar">
                            {review.userName?.charAt(0).toUpperCase() || '?'}
                          </span>
                          <div className="reviewer-details">
                            <span className="reviewer-name">{review.userName}</span>
                            <span className="review-date">
                              {review.createdAt.toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="review-rating">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`star small ${star <= review.rating ? 'filled' : ''}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="review-comment">{review.comment}</p>
                      )}
                      {review.userId === currentUser?.uid && (
                        <span className="your-review-badge">Your Review</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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