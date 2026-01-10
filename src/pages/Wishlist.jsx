import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { CartContext } from '../Context/CartContext';
import './Wishlist.css';

function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const { addToCart } = useContext(CartContext);
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/Login');
      return;
    }

    // Real-time listener for wishlist
    const wishlistRef = collection(db, 'wishlists');
    const q = query(wishlistRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate() || new Date(),
      }));
      // Sort by most recently added
      items.sort((a, b) => b.addedAt - a.addedAt);
      setWishlistItems(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching wishlist:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleRemoveFromWishlist = async (docId) => {
    setRemovingId(docId);
    try {
      await deleteDoc(doc(db, 'wishlists', docId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      alert(`Error removing item: ${error.message}`);
    }
    setRemovingId(null);
  };

  const handleAddToCart = (item) => {
    addToCart({
      id: item.productId,
      title: item.title,
      price: item.currentPrice || item.price,
      originalPrice: item.originalPrice || item.price,
      currentPrice: item.currentPrice || item.price,
      isDiscounted: item.isDiscounted || false,
      discountPercent: item.discountPercent || 0,
      image: item.image,
      category: item.category,
    }, 1);
    // Show success feedback
    alert(`${item.title} added to cart!`);
  };

  const handleMoveAllToCart = () => {
    wishlistItems.forEach(item => {
      addToCart({
        id: item.productId,
        title: item.title,
        price: item.currentPrice || item.price,
        originalPrice: item.originalPrice || item.price,
        currentPrice: item.currentPrice || item.price,
        isDiscounted: item.isDiscounted || false,
        discountPercent: item.discountPercent || 0,
        image: item.image,
        category: item.category,
      }, 1);
    });
    alert('All items added to cart!');
  };

  const handleViewProduct = (productId) => {
    navigate(`/ProductDetails/${productId}`);
  };

  if (loading) {
    return (
      <div className="wishlist-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="wishlist-container">
        <div className="wishlist-header">
          <div className="header-content">
            <h1>My Wishlist</h1>
            <p className="subtitle">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
          {wishlistItems.length > 0 && (
            <button className="move-all-btn" onClick={handleMoveAllToCart}>
              <span className="btn-icon">🛒</span>
              Add All to Cart
            </button>
          )}
        </div>

        {wishlistItems.length === 0 ? (
          <div className="empty-wishlist">
            <div className="empty-icon">💝</div>
            <h3>Your wishlist is empty</h3>
            <p>Save items you love by clicking the heart icon on products</p>
            <button className="browse-btn" onClick={() => navigate('/Products')}>
              Browse Products
            </button>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlistItems.map((item) => (
              <div key={item.docId} className={`wishlist-card ${removingId === item.docId ? 'removing' : ''}`}>
                <button 
                  className="remove-btn"
                  onClick={() => handleRemoveFromWishlist(item.docId)}
                  title="Remove from wishlist"
                >
                  ✕
                </button>
                
                <div className="card-image" onClick={() => handleViewProduct(item.productId)}>
                  <img 
                    src={item.image || 'https://placehold.co/200x200?text=Product'} 
                    alt={item.title}
                  />
                  {item.isDiscounted && item.discountPercent > 0 && (
                    <span className="discount-badge">-{item.discountPercent}%</span>
                  )}
                </div>

                <div className="card-content">
                  <span className="category">{item.category || 'General'}</span>
                  <h3 className="title" onClick={() => handleViewProduct(item.productId)}>
                    {item.title?.length > 40 ? item.title.substring(0, 40) + '...' : item.title}
                  </h3>
                  
                  <div className="price-section">
                    {item.isDiscounted && item.originalPrice > (item.currentPrice || item.price) ? (
                      <>
                        <span className="original-price">£{item.originalPrice.toFixed(2)}</span>
                        <span className="current-price discounted">£{(item.currentPrice || item.price)?.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="current-price">£{(item.currentPrice || item.price)?.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="card-actions">
                    <button 
                      className="add-to-cart-btn"
                      onClick={() => handleAddToCart(item)}
                    >
                      <span className="btn-icon">🛒</span>
                      Add to Cart
                    </button>
                    <button 
                      className="view-btn"
                      onClick={() => handleViewProduct(item.productId)}
                    >
                      View
                    </button>
                  </div>

                  <p className="added-date">
                    Added {item.addedAt.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Wishlist;
