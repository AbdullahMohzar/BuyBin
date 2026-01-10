import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, orderBy, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FaBell, FaTag, FaTrash, FaCheck, FaShoppingBag } from 'react-icons/fa';
import './NotificationsTab.css';

function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch notifications from Firestore
  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef, 
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const notificationsList = [];
        snapshot.forEach((doc) => {
          notificationsList.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        setNotifications(notificationsList);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching notifications:', error);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Calculate relative time (e.g., "2 hours ago")
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';

    const now = new Date();
    const notificationTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return notificationTime.toLocaleDateString();
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle Shop Now click
  const handleShopNow = (notification) => {
    markAsRead(notification.id);
    if (notification.productId) {
      navigate(`/ProductDetails/${notification.productId}`);
    } else {
      navigate('/');
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'deal':
      case 'deal_alert':
        return <FaTag className="notification-icon deal" />;
      default:
        return <FaBell className="notification-icon default" />;
    }
  };

  if (loading) {
    return (
      <div className="notifications-tab">
        <div className="notifications-loading">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-tab">
      <div className="notifications-header">
        <h2>
          <FaBell /> Notifications
        </h2>
        <span className="notification-count">
          {notifications.filter((n) => !n.read).length} unread
        </span>
      </div>

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <FaBell className="empty-icon" />
          <h3>No notifications yet</h3>
          <p>We'll notify you about deals, orders, and updates here.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${notification.read ? 'read' : 'unread'}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="notification-icon-wrapper">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="notification-content">
                <div className="notification-title-row">
                  <h4 className="notification-title">{notification.title || 'Notification'}</h4>
                  {!notification.read && <span className="unread-dot"></span>}
                </div>

                <p className="notification-message">{notification.message}</p>

                <div className="notification-footer">
                  <span className="notification-time">
                    {getRelativeTime(notification.createdAt)}
                  </span>

                  {(notification.type === 'deal' || notification.type === 'deal_alert') && (
                    <button
                      className="shop-now-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShopNow(notification);
                      }}
                    >
                      <FaShoppingBag /> Shop Now
                    </button>
                  )}
                </div>

                {notification.discountPercent && (
                  <div className="notification-deal-info">
                    <span className="discount-badge">{notification.discountPercent}% OFF</span>
                    {notification.originalPrice && notification.currentPrice && (
                      <span className="price-info">
                        <span className="original-price">${notification.originalPrice.toFixed(2)}</span>
                        <span className="current-price">${notification.currentPrice.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="notification-actions">
                {!notification.read && (
                  <button
                    className="action-btn mark-read"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    title="Mark as read"
                  >
                    <FaCheck />
                  </button>
                )}
                <button
                  className="action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsTab;
