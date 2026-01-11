import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockApi } from './mockApi';
import './Dashboard.css';
import GlitchText from '../Components/GlitchText.jsx';
import { CartContext } from '../Context/CartContext';
import { FaShoppingCart, FaFire, FaStar, FaArrowRight, FaCrown, FaBolt } from 'react-icons/fa';

// Shuffle array function
const shuffleArray = (array) => {
  return [...array].sort(() => Math.random() - 0.5);
};

const categories = shuffleArray([
  { name: 'Audio', icon: '🎧', color: '#8B5CF6' },
  { name: 'Gaming', icon: '🎮', color: '#06D6A0' },
  { name: 'Mobile', icon: '📱', color: '#F59E0B' },
  { name: 'TV', icon: '📺', color: '#EF4444' },
  { name: 'Appliances', icon: '🏠', color: '#3B82F6' },
  { name: 'Laptop', icon: '💻', color: '#8B5CF6' },
]);

function Dashboard() {
  const { cartItems } = useContext(CartContext);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [displayCount, setDisplayCount] = useState(6);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const allProducts = await mockApi.getProducts();
        // Transform products to ensure price fields are properly set
        const transformedProducts = allProducts.map(product => ({
          ...product,
          price: Number(product.currentPrice || product.price || 0),
          currentPrice: Number(product.currentPrice || product.price || 0),
          originalPrice: Number(product.originalPrice || product.price || 0),
        }));
        const randomProducts = shuffleArray(transformedProducts);
        setFeaturedProducts(randomProducts);
        setTrendingProducts(shuffleArray(transformedProducts).slice(0, 4));
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // When handling search
const handleSearch = (e) => {
  e.preventDefault();
  if (searchTerm.trim()) {
    navigate(`/Products?search=${encodeURIComponent(searchTerm.trim())}`);
    setSearchTerm('');
  }
};


// When clicking a category
const handleCategoryClick = (category) => {
  navigate(`/Products?category=${encodeURIComponent(category.name.toLowerCase())}`);
};



  const handleProductClick = (productId) => {
    navigate(`/ProductDetails/${productId}`);
  };

  const handleLoadMore = () => {
    setDisplayCount((prevCount) => prevCount + 6);
  };

  const displayedProducts = featuredProducts.slice(0, displayCount);
  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const handleCartClick = () => {
    navigate('/Cart');
  };

  return (
    <div className="dashboard-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <GlitchText
              speed={1}
              enableShadows={true}
              enableOnHover={true}
              className="hero-title"
            >
              BuyBin
            </GlitchText>
            <h2 className="hero-subtitle">Your Ultimate Shopping Destination</h2>
            <p className="hero-description">
              Discover amazing products at unbeatable prices. From the latest tech gadgets to everyday essentials.
            </p>
            <div className="hero-actions">
              <button className="cta-primary" onClick={() => navigate('/Products')}>
                <FaBolt className="btn-icon" />
                Shop Now
              </button>
              <button className="cta-secondary" onClick={() => navigate('/Products?category=gaming')}>
                <FaFire className="btn-icon" />
                Hot Deals
              </button>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="hero-search">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search for products, brands, and more..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="section-header">
          <h2 className="section-title">
            <FaStar className="title-icon" />
            Popular Categories
          </h2>
          <Link to="/Products" className="view-all-link">
            View All <FaArrowRight />
          </Link>
        </div>
        <div className="categories-grid">
          {categories.map((cat, i) => (
            <div
              key={i}
              className="category-card"
              onClick={() => handleCategoryClick(cat)}
              style={{ '--category-color': cat.color }}
            >
              <div className="category-icon">{cat.icon}</div>
              <div className="category-name">{cat.name}</div>
              <div className="category-overlay"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Products */}
      <section className="trending-section">
        <div className="section-header">
          <h2 className="section-title">
            <FaFire className="title-icon trending-icon" />
            Trending Now
          </h2>
        </div>
        <div className="trending-grid">
          {trendingProducts.map((product, index) => (
            <div
              key={product.id}
              className="trending-card"
              onClick={() => handleProductClick(product.id)}
            >
              <div className="trending-badge">#{index + 1}</div>
              <div className="trending-image">
                {product.image ? (
                  <img src={product.image} alt={product.title} />
                ) : (
                  <div className="image-placeholder">No Image</div>
                )}
              </div>
              <div className="trending-info">
                <h3 className="trending-title">{product.title}</h3>
                <div className="trending-price">£{product.price?.toFixed(2)}</div>
                <div className="trending-rating">
                  <FaStar className="star-icon" />
                  <span>4.{Math.floor(Math.random() * 9) + 1}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-section">
        <div className="section-header">
          <h2 className="section-title">
            <FaCrown className="title-icon" />
            Featured Products
          </h2>
          <Link to="/Products" className="view-all-link">
            View All <FaArrowRight />
          </Link>
        </div>
        <div className="products-grid">
          {loading ? (
            Array(6).fill().map((_, i) => (
              <div key={i} className="product-card skeleton">
                <div className="product-image-placeholder">Loading...</div>
                <div className="product-info">
                  <h3 className="product-name">Loading</h3>
                  <p className="product-price">£0.00</p>
                </div>
              </div>
            ))
          ) : (
            displayedProducts.map((product) => (
              <div
                key={product.id}
                className="product-card"
                onClick={() => handleProductClick(product.id)}
              >
                <div className="product-image-placeholder">
                  {product.image ? (
                    <img src={product.image} alt={product.title} />
                  ) : (
                    'Product Image'
                  )}
                  <div className="product-overlay">
                    <button className="quick-view-btn">Quick View</button>
                  </div>
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.title}</h3>
                  <div className="product-rating">
                    <FaStar className="star-icon" />
                    <span>4.{Math.floor(Math.random() * 9) + 1}</span>
                  </div>
                  <p className="product-price">£{product.price.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {!loading && displayedProducts.length < featuredProducts.length && (
          <button className="load-more-btn" onClick={handleLoadMore}>
            Load More Products
            <FaArrowRight className="btn-icon" />
          </button>
        )}
      </section>

      {/* Floating Cart */}
      {totalItems > 0 && (
        <div className="floating-cart" onClick={handleCartClick}>
          <FaShoppingCart size={24} />
          <span className="cart-counter">{totalItems}</span>
        </div>
      )}
    </div>
  );
}

export default Dashboard;