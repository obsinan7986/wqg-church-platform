const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

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

    // Live Studio Events
    socket.on('join_meeting_studio', ({ meetingId }) => {
      if (!meetingId) return;
      socket.currentMeetingId = meetingId;
      socket.join(`meeting_${meetingId}`);
      console.log(`[Socket] User ${socket.user?.fullName || socket.id} joined meeting_${meetingId}`);
      socket.to(`meeting_${meetingId}`).emit('user_joined_studio', {
        user: socket.user ? {
          _id: socket.user._id,
          fullName: socket.user.fullName,
          role: socket.user.role,
          originChurch: socket.user.originChurch
        } : null,
        socketId: socket.id
      });
    });

    socket.on('leave_meeting_studio', ({ meetingId }) => {
      if (!meetingId) return;
      socket.leave(`meeting_${meetingId}`);
      if (socket.currentMeetingId === meetingId) {
        socket.currentMeetingId = null;
      }
      socket.to(`meeting_${meetingId}`).emit('user_left_studio', {
        userId: socket.user?._id,
        socketId: socket.id
      });
    });

    // WebRTC Signaling Forwarder (offer, answer, candidate, renegotiate, etc.)
    socket.on('webrtc_signal', ({ to, signal, meetingId }) => {
      const payload = {
        from: socket.id,
        senderUser: socket.user ? {
          _id: socket.user._id,
          fullName: socket.user.fullName,
          role: socket.user.role,
          originChurch: socket.user.originChurch,
          avatarUrl: socket.user.avatarUrl
        } : null,
        signal
      };

      if (to) {
        const targetRoom = (typeof to === 'string' && /^[0-9a-fA-F]{24}$/.test(to))
          ? `user_${to}`
          : to;
        io.to(targetRoom).emit('webrtc_signal', payload);
      } else if (meetingId) {
        socket.to(`meeting_${meetingId}`).emit('webrtc_signal', payload);
      }
    });

    // Disconnect event
    socket.on('disconnect', async () => {
      if (socket.currentMeetingId) {
        socket.to(`meeting_${socket.currentMeetingId}`).emit('user_left_studio', {
          userId: socket.user?._id,
          socketId: socket.id
        });
        socket.currentMeetingId = null;
      }
      if (socket.user) {
        console.log(`[Socket] User disconnected: ${socket.user.fullName}`);
        await User.findByIdAndUpdate(socket.user._id, { isOnline: false }).catch(() => {});
        io.to('all_users_room').emit('user_status_changed', {
          userId: socket.user._id,
          isOnline: false
        });
      }
    });
  });
};

module.exports = initSocketHandler;
