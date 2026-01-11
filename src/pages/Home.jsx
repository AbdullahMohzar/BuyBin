import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockApi } from './mockApi';
import './Home.css';
import GlitchText from '../Components/GlitchText.jsx';
import ProfileCard from '../Components/ProfileCard.jsx';
import { useContext } from 'react';
import { CartContext } from '../Context/CartContext';
import { FaShoppingCart } from 'react-icons/fa'; // Import cart icon

// Shuffle array function
const shuffleArray = (array) => {
  return [...array].sort(() => Math.random() - 0.5);
};

const categories = shuffleArray([
  { name: 'Audio', icon: '🎧' },
  { name: 'Gaming', icon: '🎮' },
  { name: 'Mobile', icon: '📱' },
  { name: 'TV', icon: '📺' },
  { name: 'Appliances', icon: '🏠' },
  { name: 'Laptop', icon: '💻' },
]);

function AlibabaLayout() {
  const { cartItems } = useContext(CartContext);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [displayCount, setDisplayCount] = useState(5); // Start with 5 products
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadFeaturedProducts = async () => {
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
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFeaturedProducts();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/Products?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  const handleCategoryClick = (category) => {
    navigate(`/Products?category=${encodeURIComponent(category.name.toLowerCase())}`);
  };

  const handleProductClick = (productId) => {
    navigate(`/ProductDetails/${productId}`);
  };

  const handleLoadMore = () => {
    setDisplayCount((prevCount) => prevCount + 10); // Load 5 more products
  };

  const displayedProducts = featuredProducts.slice(0, displayCount);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0); // Total quantity in cart

  const handleCartClick = () => {
    navigate('/Cart');
  };

  return (
    <div className="container">
      {/* Topbar */}
      {/* <div className="topbar">
        <div>Help Center | English | USD</div>
        <div>
          <Link to="/Login" className="link">Sign In</Link> | 
          <Link to="/register" className="link">Join Free</Link>
        </div>
      </div> */}

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo" onClick={() => navigate('/')}>BuyBin</div>
        <div className="searchbar">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search products..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
        </div>
        <div className="categories">
          <button>
            Categories
            <svg className="icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="categories-menu">
            <ul>
              {categories.map((cat, i) => (
                <li key={i} className="categories-item" onClick={() => handleCategoryClick(cat)}>
                  {cat.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>

      {/* Banner / Carousel */}
      <section className="banner">
        <GlitchText
          speed={1}
          enableShadows={true}
          enableOnHover={true}
          className="custom-class"
        >
          BuyBin
        </GlitchText>
      </section>

      {/* Featured Categories */}
      <section className="section popular-categories">
        {categories.map((cat, i) => (
          <div key={i} className="category-item" onClick={() => handleCategoryClick(cat)}>
            <div className="circle">
              <span className="icon">{cat.icon}</span>
            </div>
            <div className="category-label">{cat.name}</div>
          </div>
        ))}
      </section>

      {/* Featured Products */}
      <section className="section">
        <h2 className="section-title">Featured Products</h2>
        <div className="products-grid">
          {loading ? (
            Array(5).fill().map((_, i) => (
              <div key={i} className="product-card">
                <div className="product-image-placeholder">Loading...</div>
                <h3 className="product-name">Loading</h3>
                <p className="product-price">£0.00</p>
              </div>
            ))
          ) : (
            displayedProducts.map((product) => (
              <div key={product.id} className="product-card" onClick={() => handleProductClick(product.id)}>
                <div className="product-image-placeholder">
                  {product.image ? <img src={product.image} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Product Image'}
                </div>
                <h3 className="product-name">{product.title}</h3>
                <div className="product-rating">
                  <span className="star">★</span>
                  <span>{product.rating?.rate || (Math.random() * 2 + 3).toFixed(1)}</span>
                </div>
                <p className="product-price">£{product.price.toFixed(2)}</p>
              </div>
            ))
          )}
        </div>
        {!loading && displayedProducts.length < featuredProducts.length && (
          <button className="load-more-btn" onClick={handleLoadMore}>
            Load More <svg className="arrow-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </section>

      <div className="testimonial-right">
        <ProfileCard
          name="Abdullah Mohzar"
          title="Software Engineer"
          handle="mohzar"
          status=""
          contactText="Contact Me"
          avatarUrl="src\assets\pf3.png"
          showUserInfo={true}
          enableTilt={true}
          onContactClick={() => console.log('Contact clicked')}
        />
      </div>

      {/* Footer */}
      <footer className="footer">
        &copy; {new Date().getFullYear()} BuyBin. All rights reserved.
      </footer>

      {/* Cart Icon with Counter */}
      <div className="cart-icon" onClick={handleCartClick}>
        <FaShoppingCart size={24} />
        {totalItems > 0 && (
          <span className="cart-counter">{totalItems}</span>
        )}
      </div>
    </div>
  );
}

export default AlibabaLayout;