const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const radioService = require('../services/radioService');

const EXEC_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COLLECTOR', 'HR', 'SECRETARY'];

const initSocketHandler = (io) => {
  // Socket.io middleware for JWT authentication
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        // Allow unauthenticated connection for public broadcasts if needed,
        // but mark socket as unauthenticated
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select(
        '_id fullName role originChurch address languagePref'
      );

      if (user) {
        socket.user = user;
      }
      next();
    } catch (err) {
      console.warn(`[Socket Auth Warning]: ${err.message}`);
      // Don't crash handshake, let socket connect as guest
      socket.user = null;
      next();
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;

    // Default room for all connected clients
    socket.join('all_users_room');

    // Send current Gospel Radio state immediately upon connection
    socket.emit('radio_state', radioService.getState());

    if (user) {
      // Join personal room
      socket.join(`user_${user._id}`);
      console.log(`[Socket] User ${user.fullName} (${user.role}) connected: ${socket.id}`);

      // If user is one of the 5 executive roles, automatically join exec_5_actors_room
      if (EXEC_ROLES.includes(user.role)) {
        socket.join('exec_5_actors_room');
        console.log(`[Socket] Joined executive room: ${user.fullName} (${user.role})`);
      }

      // Mark user online in DB
      await User.findByIdAndUpdate(user._id, { isOnline: true }).catch(() => {});
      io.to('all_users_room').emit('user_status_changed', {
        userId: user._id,
        isOnline: true
      });
    } else {
      console.log(`[Socket] Anonymous guest connected: ${socket.id}`);
    }

    // Explicit login/authentication event if client connects before token is ready
    socket.on('authenticate', async (token) => {
      try {
        if (!token) return;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const authedUser = await User.findById(decoded.id).select(
          '_id fullName role originChurch address languagePref'
        );

        if (authedUser) {
          socket.user = authedUser;
          socket.join(`user_${authedUser._id}`);

          if (EXEC_ROLES.includes(authedUser.role)) {
            socket.join('exec_5_actors_room');
          }

          await User.findByIdAndUpdate(authedUser._id, { isOnline: true }).catch(() => {});
          io.to('all_users_room').emit('user_status_changed', {
            userId: authedUser._id,
            isOnline: true
          });
        }
      } catch (err) {
        console.warn('[Socket authenticate event error]:', err.message);
      }
    });

    // Handle real-time messaging for exec_5_actors_room
    socket.on('send_exec_message', async (data, callback) => {
      try {
        const currentUser = socket.user;
        if (!currentUser || !EXEC_ROLES.includes(currentUser.role)) {
          if (callback) callback({ success: false, message: 'Unauthorized for Executive chat' });
          return;
        }

        const content = typeof data === 'string' ? data : data.content;
        if (!content || !content.trim()) return;

        const newMsg = await Message.create({
          sender: currentUser._id,
          channel: 'EXEC_5_ACTORS',
          content: content.trim(),
          readBy: [currentUser._id]
        });

        const populatedMsg = await Message.findById(newMsg._id)
          .populate('sender', 'fullName role originChurch address.city')
          .lean();

        // Broadcast to all executive members
        io.to('exec_5_actors_room').emit('new_exec_message', populatedMsg);

        if (callback) callback({ success: true, message: populatedMsg });
      } catch (err) {
        console.error('[send_exec_message Error]:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Handle general broadcast messaging
    socket.on('send_broadcast_message', async (data, callback) => {
      try {
        const currentUser = socket.user;
        if (!currentUser) return;

        const content = typeof data === 'string' ? data : data.content;
        if (!content || !content.trim()) return;

        const newMsg = await Message.create({
          sender: currentUser._id,
          channel: 'BROADCAST',
          content: content.trim(),
          readBy: [currentUser._id]
        });

        const populatedMsg = await Message.findById(newMsg._id)
          .populate('sender', 'fullName role originChurch address.city')
          .lean();

        io.to('all_users_room').emit('new_broadcast_message', populatedMsg);

        if (callback) callback({ success: true, message: populatedMsg });
      } catch (err) {
        console.error('[send_broadcast_message Error]:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Handle typing indicators
    socket.on('typing_exec', (isTyping) => {
      if (socket.user && EXEC_ROLES.includes(socket.user.role)) {
        socket.to('exec_5_actors_room').emit('user_typing_exec', {
          userId: socket.user._id,
          fullName: socket.user.fullName,
          role: socket.user.role,
          isTyping
        });
      }
    });

    // Disconnect event
    socket.on('disconnect', async () => {
      // Remove from active radio listeners
      radioService.removeListener(socket.id, io);

      if (socket.user) {
        console.log(`[Socket] User disconnected: ${socket.user.fullName}`);
        await User.findByIdAndUpdate(socket.user._id, { isOnline: false }).catch(() => {});
        io.to('all_users_room').emit('user_status_changed', {
          userId: socket.user._id,
          isOnline: false
        });
      }
    });

    // ==========================================
    // Gospel Radio Events
    // ==========================================
    socket.on('radio_listen_start', () => {
      radioService.addListener(socket.id, io);
    });

    socket.on('radio_listen_stop', () => {
      radioService.removeListener(socket.id, io);
    });

    socket.on('radio_play', async (data, callback) => {
      try {
        if (!radioService.isAuthorized(socket.user)) {
          if (callback) callback({ success: false, message: 'Unauthorized: Only Super Admin, Admin, or Secretary can control Gospel Radio.' });
          return;
        }
        const state = await radioService.play(data, socket.user, io);
        if (callback) callback({ success: true, state });
      } catch (err) {
        console.error('[radio_play socket error]:', err.message);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('radio_pause', async (data, callback) => {
      try {
        if (!radioService.isAuthorized(socket.user)) {
          if (callback) callback({ success: false, message: 'Unauthorized' });
          return;
        }
        const state = await radioService.pause(socket.user, io);
        if (callback) callback({ success: true, state });
      } catch (err) {
        console.error('[radio_pause socket error]:', err.message);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('radio_resume', async (data, callback) => {
      try {
        if (!radioService.isAuthorized(socket.user)) {
          if (callback) callback({ success: false, message: 'Unauthorized' });
          return;
        }
        const state = await radioService.resume(socket.user, io);
        if (callback) callback({ success: true, state });
      } catch (err) {
        console.error('[radio_resume socket error]:', err.message);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('radio_stop', async (data, callback) => {
      try {
        if (!radioService.isAuthorized(socket.user)) {
          if (callback) callback({ success: false, message: 'Unauthorized' });
          return;
        }
        const state = await radioService.stop(socket.user, io);
        if (callback) callback({ success: true, state });
      } catch (err) {
        console.error('[radio_stop socket error]:', err.message);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('radio_seek', async (data, callback) => {
      try {
        if (!radioService.isAuthorized(socket.user)) {
          if (callback) callback({ success: false, message: 'Unauthorized' });
          return;
        }
        const positionSeconds = typeof data === 'object' ? data.positionSeconds : data;
        const state = await radioService.seek(positionSeconds, socket.user, io);
        if (callback) callback({ success: true, state });
      } catch (err) {
        console.error('[radio_seek socket error]:', err.message);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('radio_next', async (data, callback) => {
      try {
        if (!radioService.isAuthorized(socket.user)) {
          if (callback) callback({ success: false, message: 'Unauthorized' });
          return;
        }
        const state = await radioService.next(socket.user, io);
        if (callback) callback({ success: true, state });
      } catch (err) {
        console.error('[radio_next socket error]:', err.message);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('radio_queue_update', async (data, callback) => {
      try {
        if (!radioService.isAuthorized(socket.user)) {
          if (callback) callback({ success: false, message: 'Unauthorized' });
          return;
        }
        const { queue, loop } = data || {};
        const state = await radioService.updateQueue(queue, loop, socket.user, io);
        if (callback) callback({ success: true, state });
      } catch (err) {
        console.error('[radio_queue_update socket error]:', err.message);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('radio_ended', async (data, callback) => {
      try {
        const { trackId, startedAt } = data || {};
        // Any connected client can report ended (it's idempotent)
        // But only advance if the reported track matches the current playing track
        const currentState = radioService.getState();
        if (currentState.mediaId && currentState.mediaId.toString() !== String(trackId)) {
          if (callback) callback({ success: false, message: 'Track mismatch, ignoring.' });
          return;
        }
        // Use a system user for the next() call - use the socket user if available, else a fallback
        const actingUser = socket.user || { _id: 'system', role: 'SUPER_ADMIN', fullName: 'Auto-Advance' };
        const state = await radioService.trackEnded(trackId, startedAt, actingUser, io);
        if (callback) callback({ success: true, state });
      } catch (err) {
        console.error('[radio_ended socket error]:', err.message);
        if (callback) callback({ success: false, error: err.message });
      }
    });
  });
};

module.exports = initSocketHandler;
