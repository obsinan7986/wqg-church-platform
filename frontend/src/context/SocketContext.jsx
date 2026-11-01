import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [toastNotification, setToastNotification] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const toastTimeoutRef = useRef(null);

  // Derive unread count strictly from items list
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Fetch initial notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      const fetchInitialNotifications = async () => {
        try {
          const res = await api.get('/notifications');
          if (res.data?.success && Array.isArray(res.data.notifications)) {
            setNotifications(res.data.notifications);
          }
        } catch (err) {
          console.warn('[SocketContext] Failed to load notifications:', err.message);
        }
      };

      fetchInitialNotifications();
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, token]);

  // Manage Socket.io connection lifecycle
  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
        : (import.meta.env.DEV ? 'http://localhost:5000' : 'https://wqg-church-platform.onrender.com'));
    const newSocket = io(socketUrl, {
      auth: token ? { token } : {},
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    newSocket.on('connect', () => {
      console.log(`[Socket.io Client] Connected with ID: ${newSocket.id}`);
      if (token) {
        newSocket.emit('authenticate', token);
      }
    });

    // Real-time Notification Listener
    newSocket.on('new_notification', (notification) => {
      console.log('[Socket.io Client] New notification received:', notification);
      setNotifications((prev) => {
        const exists = prev.some((n) => n._id === notification._id);
        if (exists) return prev;
        return [notification, ...prev];
      });

      // Trigger real-time floating toast
      setToastNotification(notification);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToastNotification(null);
      }, 7000);
    });

    // Online Status listener
    newSocket.on('user_status_changed', ({ userId, isOnline }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId.toString());
        } else {
          next.delete(userId.toString());
        }
        return next;
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`[Socket.io Client] Disconnected: ${reason}`);
    });

    setSocket(newSocket);

    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  const markNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('[markNotificationRead Error]:', err.message);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('[markAllNotificationsRead Error]:', err.message);
    }
  };

  const clearToast = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastNotification(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        toastNotification,
        onlineUsers,
        markNotificationRead,
        markAllNotificationsRead,
        clearToast
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
