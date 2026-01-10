import { useState, useEffect, useRef, useMemo, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Products.css";
import { FaSearch, FaFilter, FaStar, FaHeart, FaShoppingCart, FaEye, FaTh, FaList, FaSort } from 'react-icons/fa';
import { CartContext } from '../Context/CartContext';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';

function Product() {
  const { addToCart } = useContext(CartContext);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(12);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [wishlist, setWishlist] = useState(new Set()); // Stores product IDs
  const [wishlistMap, setWishlistMap] = useState({}); // Maps productId -> docId
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const productsPerPage = 20;
  const sentinelRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const fallbackImage = "https://placehold.co/300x300?text=Product+Image";

  // Fetch Wishlist - with auth state listener
  useEffect(() => {
    let unsubscribeWishlist = () => {};
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Cleanup previous wishlist listener
      unsubscribeWishlist();
      
      if (!user) {
        setWishlist(new Set());
        setWishlistMap({});
        return;
      }

      const q = query(collection(db, 'wishlists'), where('userId', '==', user.uid));
      unsubscribeWishlist = onSnapshot(q, (snapshot) => {
        const newWishlist = new Set();
        const newMap = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          // Store both string and original format for compatibility
          newWishlist.add(data.productId);
          newWishlist.add(String(data.productId));
          newMap[data.productId] = doc.id;
          newMap[String(data.productId)] = doc.id;
        });
        setWishlist(newWishlist);
        setWishlistMap(newMap);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeWishlist();
    };
  }, []);

  const showNotificationWithMessage = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleAddToCart = (product) => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.currentPrice || product.price,
      originalPrice: product.originalPrice || product.price,
      currentPrice: product.currentPrice || product.price,
      isDiscounted: product.isDiscounted || false,
      discountPercent: product.discountPercent || 0,
      image: product.image,
      category: product.category,
    }, 1);
    showNotificationWithMessage('Item added to Cart');
  };

  const toggleWishlist = async (product) => {
    const user = auth.currentUser;
    if (!user) {
      showNotificationWithMessage("Please sign in to manage your wishlist.");
      navigate('/Login');
      return;
    }

    const productId = product.id;

    try {
      if (wishlist.has(productId)) {
        // Remove from wishlist
        const docId = wishlistMap[productId];
        if (docId) {
          await deleteDoc(doc(db, 'wishlists', docId));
          showNotificationWithMessage('Removed from Wishlist');
        }
      } else {
        // Add to wishlist
        // Double check duplicate isn't created by race condition (optional since UI is optimistic)
        await addDoc(collection(db, 'wishlists'), {
          userId: user.uid,
          productId: String(productId), // Ensure consistent string type
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
        showNotificationWithMessage('Added to Wishlist ❤️');
      }
    } catch (err) {
      console.error("Error updating wishlist:", err);
      showNotificationWithMessage("Failed to update wishlist: " + err.message);
    }
  };

  const handleViewDetails = (id) => {
    navigate(`/ProductDetails/${id}`);
  };

  // Extract categories dynamically
  const categories = useMemo(() => {
    const allCats = products.map((p) => p.category);
    return ["All", ...new Set(allCats)];
  }, [products]);

  // Apply filters + sorting
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchTerm.trim()) {
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory && selectedCategory !== "All") {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (minPrice) {
      filtered = filtered.filter((p) => p.price >= parseFloat(minPrice));
    }

    if (maxPrice) {
      filtered = filtered.filter((p) => p.price <= parseFloat(maxPrice));
    }

    if (sortOption === "lowToHigh") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "highToLow") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortOption === "nameAZ") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === "nameZA") {
      filtered.sort((a, b) => b.title.localeCompare(a.title));
    }

    return filtered;
  }, [products, searchTerm, selectedCategory, minPrice, maxPrice, sortOption]);

  const displayedProducts = filteredProducts.slice(0, displayCount);

  const isValidImageUrl = (url) => {
    return url && typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
  };

  // Load products from Firestore
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        
        // Fetch products from Firestore 'products' collection
        const productsRef = collection(db, 'products');
        const querySnapshot = await getDocs(productsRef);
        
        const fetchedProducts = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const imageUrl = data.image || fallbackImage;
          
          fetchedProducts.push({
            id: doc.id,
            title: data.title || "Untitled Product",
            originalPrice: Number(data.originalPrice || data.price || 0),
            currentPrice: Number(data.currentPrice || data.price || 0),
            isDiscounted: data.isDiscounted || false,
            discountPercent: data.discountPercent || 0,
            // Keep price for backward compatibility with filtering/sorting
            price: Number(data.currentPrice || data.price || 0),
            image: isValidImageUrl(imageUrl) ? imageUrl : fallbackImage,
            category: data.category || "Unknown",
            rating: data.rating || (Math.random() * 2 + 3),
            reviews: data.reviews || Math.floor(Math.random() * 500) + 10,
            description: data.description || "",
            stock: data.stock || 0,
            source: "firestore",
          });
        });

        setProducts(fetchedProducts);
        setError(null);
      } catch (err) {
        setError("Error loading products. Please try again later.");
        console.error("Firestore load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && displayCount < filteredProducts.length) {
          setDisplayCount((prev) => prev + productsPerPage);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => {
      if (sentinelRef.current) observer.unobserve(sentinelRef.current);
    };
  }, [loading, filteredProducts.length, displayCount]);

  // Sync with URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get("search");
    const category = params.get("category");

    setSearchTerm(search || "");
    setSelectedCategory(category || "All");
    setDisplayCount(12);
  }, [location.search]);

  const handleImageError = (e) => {
    e.target.src = fallbackImage;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setMinPrice("");
    setMaxPrice("");
    setSortOption("default");
  };

  return (
    <div className="enhanced-products-page">
      {showNotification && <div className="notification">{notificationMessage}</div>}
      {/* Hero Section */}
      <section className="products-hero">
        <div className="hero-content">
          <h1 className="hero-title">Discover Amazing Products</h1>
          <p className="hero-subtitle">Find exactly what you're looking for from our curated collection</p>
          
          {/* Search Bar */}
          <div className="hero-search">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search for products, brands, and more..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button 
                className="filter-toggle-btn"
                onClick={() => setFiltersVisible(!filtersVisible)}
              >
                <FaFilter />
                Filters
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="products-container">
        {/* Advanced Filters Panel */}
        <div className={`filters-panel ${filtersVisible ? 'visible' : ''}`}>
          <div className="filters-header">
            <h3>Filters</h3>
            <button className="clear-filters" onClick={clearFilters}>Clear All</button>
          </div>
          
          <div className="filter-group">
            <label>Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat} {cat !== "All" && `(${products.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length})`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Price Range</label>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="price-input"
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="price-input"
              />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="products-toolbar">
          <div className="results-info">
            <span className="results-count">
              {loading ? "Loading..." : `${filteredProducts.length} products found`}
            </span>
            {searchTerm && (
              <span className="search-info">for "{searchTerm}"</span>
            )}
          </div>

          <div className="toolbar-controls">
            <div className="sort-container">
              <FaSort className="sort-icon" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="sort-select"
              >
                <option value="default">Sort by</option>
                <option value="lowToHigh">Price: Low to High</option>
                <option value="highToLow">Price: High to Low</option>
                <option value="nameAZ">Name: A to Z</option>
                <option value="nameZA">Name: Z to A</option>
              </select>
            </div>

            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <FaTh />
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <FaList />
              </button>
            </div>
          </div>
        </div>

        {/* Error / Loading / No Results */}
        {error && (
          <div className="status-message error">
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading amazing products...</p>
          </div>
        )}

        {!loading && filteredProducts.length === 0 && !error && (
          <div className="status-message no-results">
            <h3>No products found</h3>
            <p>Try adjusting your filters or search terms</p>
            <button onClick={clearFilters} className="retry-btn">Clear Filters</button>
          </div>
        )}

        {/* Products Grid/List */}
        <div className={`products-display ${viewMode}`}>
          {displayedProducts.map((product, index) => (
            <div 
              key={product.id} 
              className="product-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {product.isDiscounted && product.originalPrice > product.currentPrice && (
                <div className="discount-badge">
                  -{Math.round((1 - product.currentPrice / product.originalPrice) * 100)}%
                </div>
              )}
              
              <div className="product-image-container">
                <img
                  src={product.image}
                  alt={product.title}
                  className="product-image"
                  onError={handleImageError}
                />
                <div className="product-overlay">
                  <button 
                    className="overlay-btn wishlist-btn"
                    onClick={() => toggleWishlist(product)}
                    title={wishlist.has(product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <FaHeart className={wishlist.has(product.id) ? 'active' : ''} />
                  </button>
                  <button 
                    className="overlay-btn quick-view-btn"
                    onClick={() => handleViewDetails(product.id)}
                    title="View Details"
                  >
                    <FaEye />
                  </button>
                  <button 
                    className="overlay-btn cart-btn" 
                    onClick={() => handleAddToCart(product)}
                    title="Add to Cart"
                  >
                    <FaShoppingCart />
                  </button>
                </div>
              </div>

              <div className="product-info">
                <div className="product-category">{product.category}</div>
                <h3 className="product-title">{product.title}</h3>
                
                <div className="product-rating">
                  <div className="stars">
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        className={i < Math.floor(product.rating) ? 'filled' : 'empty'}
                      />
                    ))}
                  </div>
                  <span className="rating-text">
                    {product.rating.toFixed(1)} ({product.reviews})
                  </span>
                </div>

                <div className="product-pricing">
                  {product.isDiscounted && product.originalPrice > product.currentPrice ? (
                    <div className="price-group">
                      <span className="current-price discounted">
                        ${product.currentPrice.toFixed(2)}
                      </span>
                      <span className="original-price crossed-out">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="current-price">${product.currentPrice.toFixed(2)}</span>
                  )}
                </div>

                {viewMode === 'grid' ? (
                  <button
                    className="view-details-btn"
                    onClick={() => handleViewDetails(product.id)}
                  >
                    View Details
                  </button>
                ) : (
                  <div className="list-actions">
                    <button
                      className="view-details-btn"
                      onClick={() => handleViewDetails(product.id)}
                    >
                      View Details
                    </button>
                    <button className="add-to-cart-btn">
                      <FaShoppingCart />
                      Add to Cart
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Load More Sentinel */}
        {displayCount < filteredProducts.length && (
          <div ref={sentinelRef} className="load-more-sentinel">
            <div className="loading-spinner"></div>
            <p>Loading more products...</p>
          </div>
        )}

        {/* Back to Top */}
        <button 
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

export default Product;