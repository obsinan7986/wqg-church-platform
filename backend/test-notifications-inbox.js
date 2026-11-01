/**
 * Test Suite for Notification Audience Filtering and Contact Inbox System
 */
const assert = require('assert');
const mongoose = require('mongoose');

const AuditLog = require('./models/AuditLog');
AuditLog.create = async () => ({});

const Notification = require('./models/Notification');
const ContactMessage = require('./models/ContactMessage');
const notificationController = require('./controllers/notificationController');
const contactController = require('./controllers/contactController');
const auditLogger = require('./utils/auditLogger');

// Stub audit logger so tests run without live Mongo
auditLogger.logAudit = async () => {};

let testsPassed = 0;
let testsFailed = 0;

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    testsFailed++;
  }
}

async function runSuite() {
  console.log('═'.repeat(65));
  console.log('   NOTIFICATION & CONTACT INBOX SYSTEM - AUTOMATED VERIFICATION');
  console.log('═'.repeat(65));

  const adminUser = {
    _id: new mongoose.Types.ObjectId(),
    fullName: 'System Admin',
    role: 'ADMIN'
  };

  const memberUser = {
    _id: new mongoose.Types.ObjectId(),
    fullName: 'Church Member',
    role: 'MEMBER'
  };

  // Mock socket.io room tracker
  const emittedToRooms = {};
  const mockIo = {
    to: (room) => {
      if (!emittedToRooms[room]) emittedToRooms[room] = [];
      return {
        emit: (event, payload) => {
          emittedToRooms[room].push({ event, payload });
        }
      };
    },
    emit: (event, payload) => {
      if (!emittedToRooms['global']) emittedToRooms['global'] = [];
      emittedToRooms['global'].push({ event, payload });
    }
  };

  // 1. Submit contact message -> creates notification with audience ['SUPER_ADMIN', 'ADMIN'] and emits to admin_room
  let createdContactId = null;
  let createdNotifId = null;

  await runAsyncTest('Contact Submission creates admin notification & emits to admin_room only', async () => {
    // In-memory mock storage
    const msgStore = [];
    const notifStore = [];

    ContactMessage.create = async (data) => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: function () { return this; }
      };
      msgStore.push(doc);
      createdContactId = doc._id;
      return doc;
    };

    Notification.create = async (data) => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        readBy: [],
        createdAt: new Date(),
        toObject: function () { return this; }
      };
      notifStore.push(doc);
      createdNotifId = doc._id;
      return doc;
    };

    const sensitiveContact = '+251911223344 (admin-secret@test.com)';
    const longMessage = 'This is a test prayer request that is quite long to check that the preview is clipped to exactly eighty characters properly without leaking any sensitive contact details.';

    const req = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      body: {
        name: 'Abebe Bikila',
        contact: sensitiveContact,
        subject: 'Spiritual Inquiry',
        message: longMessage
      },
      app: { get: () => mockIo }
    };

    let statusCode = null;
    let resData = null;
    const res = {
      status: (c) => { statusCode = c; return res; },
      json: (d) => { resData = d; return res; }
    };

    await contactController.submitContactMessage(req, res);

    assert.strictEqual(statusCode, 201);
    assert.strictEqual(resData.success, true);
    assert(createdContactId, 'Contact ID should be generated');

    // Verify Notification attributes
    assert.strictEqual(notifStore.length, 1);
    const notif = notifStore[0];

    assert.deepStrictEqual(notif.audience, ['SUPER_ADMIN', 'ADMIN']);
    assert.strictEqual(notif.refType, 'CONTACT_MESSAGE');
    assert.strictEqual(String(notif.refId), String(createdContactId));
    assert.strictEqual(notif.link, `/dashboard?tab=contact-inbox&id=${createdContactId}`);

    // Verify preview length <= 80 and DOES NOT contain sensitive contact
    const preview = notif.message.en;
    assert(preview.length <= 80, `Preview should be <= 80 chars, got ${preview.length}`);
    assert(!preview.includes(sensitiveContact), 'Preview MUST NOT include phone or email');
    assert(!preview.includes('@test.com'), 'Preview MUST NOT include email');

    // Verify socket emissions: ONLY to admin_room, NOT all_users_room or global
    assert(emittedToRooms['admin_room'] && emittedToRooms['admin_room'].length >= 2, 'Must emit to admin_room');
    const adminEvents = emittedToRooms['admin_room'].map(e => e.event);
    assert(adminEvents.includes('new_notification'), 'admin_room must receive new_notification');
    assert(adminEvents.includes('new_contact_message'), 'admin_room must receive new_contact_message');

    assert(!emittedToRooms['all_users_room'], 'all_users_room MUST NOT receive admin contact notification');
    assert(!emittedToRooms['global'], 'global io.emit MUST NOT be called for admin contact notification');
  });

  // 2. Notification Audience Filtering: ADMIN vs MEMBER
  await runAsyncTest('GET /api/notifications returns notification to ADMIN, hides from MEMBER', async () => {
    const mockNotifications = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: { en: 'Church General Event' },
        message: { en: 'Annual Conference' },
        type: 'EVENT',
        audience: [], // Everyone
        readBy: [],
        createdAt: new Date('2026-11-01T10:00:00Z'),
        toObject: function () { return this; }
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: { en: 'New contact message' },
        message: { en: 'Inquiry preview' },
        type: 'CONTACT_MESSAGE',
        audience: ['SUPER_ADMIN', 'ADMIN'], // Restricted to Admins
        readBy: [],
        createdAt: new Date('2026-11-01T11:00:00Z'),
        toObject: function () { return this; }
      }
    ];

    // Mock query runner for Notification.find
    Notification.find = (query) => {
      let filtered = [...mockNotifications];
      if (query.$or) {
        filtered = filtered.filter(item => {
          return query.$or.some(clause => {
            if (clause.audience && clause.audience.$size === 0) {
              return Array.isArray(item.audience) && item.audience.length === 0;
            }
            if (clause.audience && typeof clause.audience === 'string') {
              return Array.isArray(item.audience) && item.audience.includes(clause.audience);
            }
            return false;
          });
        });
      }

      return {
        sort: () => ({
          limit: (n) => ({
            lean: async () => filtered.slice(0, n)
          })
        })
      };
    };

    // Test 2a: Query as ADMIN
    {
      const req = { user: adminUser, query: {} };
      let resData = null;
      const res = {
        status: () => res,
        json: (d) => { resData = d; return res; }
      };

      await notificationController.getNotifications(req, res);
      assert.strictEqual(resData.success, true);
      assert.strictEqual(resData.notifications.length, 2, 'Admin must see both general & admin notifications');
      assert.strictEqual(resData.unreadCount, 2);

      const contactNotif = resData.notifications.find(n => n.type === 'CONTACT_MESSAGE');
      assert(contactNotif, 'Admin must receive CONTACT_MESSAGE notification');
      assert.strictEqual(contactNotif.isRead, false);
    }

    // Test 2b: Query as MEMBER
    {
      const req = { user: memberUser, query: {} };
      let resData = null;
      const res = {
        status: () => res,
        json: (d) => { resData = d; return res; }
      };

      await notificationController.getNotifications(req, res);
      assert.strictEqual(resData.success, true);
      assert.strictEqual(resData.notifications.length, 1, 'Member must see ONLY general notification');
      assert.strictEqual(resData.unreadCount, 1);
      assert.strictEqual(resData.notifications[0].type, 'EVENT');

      const contactNotif = resData.notifications.find(n => n.type === 'CONTACT_MESSAGE');
      assert.strictEqual(contactNotif, undefined, 'MEMBER MUST NOT see CONTACT_MESSAGE notification');
    }
  });

  // 3. Mark Notification as Read (Per-User readBy array)
  await runAsyncTest('PATCH /api/notifications/:id/read updates per-user readBy state', async () => {
    const notifId = new mongoose.Types.ObjectId();
    const mockDoc = {
      _id: notifId,
      readBy: [],
      toObject: function () { return this; }
    };

    Notification.findById = async (id) => {
      if (String(id) === String(notifId)) return mockDoc;
      return null;
    };

    Notification.findByIdAndUpdate = async (id, update) => {
      if (String(id) === String(notifId) && update.$addToSet?.readBy) {
        const uId = update.$addToSet.readBy;
        if (!mockDoc.readBy.some(x => String(x) === String(uId))) {
          mockDoc.readBy.push(uId);
        }
      }
      return mockDoc;
    };

    // Admin marks as read
    const req = {
      params: { id: notifId.toString() },
      user: adminUser
    };
    let resData = null;
    const res = {
      status: () => res,
      json: (d) => { resData = d; return res; }
    };

    await notificationController.markAsRead(req, res);
    assert.strictEqual(resData.success, true);
    assert(mockDoc.readBy.some(id => String(id) === String(adminUser._id)), 'Admin ID must be in readBy array');
    assert(!mockDoc.readBy.some(id => String(id) === String(memberUser._id)), 'Member ID must NOT be in readBy array');
  });

  // 4. Contact Message API: GET /api/contact, GET /api/contact/:id, status workflow & delete
  await runAsyncTest('Contact Messages API for ADMIN: list, filter, getById (auto-marks READ), status & delete', async () => {
    const testMessages = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Tolera Desta',
        contact: 'tolera@example.com',
        subject: 'Youth fellowship inquiry',
        message: 'Hello, when is the youth gathering held?',
        status: 'NEW',
        createdAt: new Date('2026-11-01T08:00:00Z'),
        save: async function () { return this; },
        toObject: function () { return this; }
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Chaltu Benti',
        contact: '+251911002233',
        subject: 'Baptism request',
        message: 'I want to schedule baptism for my child.',
        status: 'READ',
        createdAt: new Date('2026-11-01T09:00:00Z'),
        save: async function () { return this; },
        toObject: function () { return this; }
      }
    ];

    // Mock ContactMessage methods
    ContactMessage.find = (filter) => {
      let filtered = [...testMessages];
      if (filter.status) {
        filtered = filtered.filter(m => m.status === filter.status);
      }
      if (filter.$or) {
        filtered = filtered.filter(m =>
          filter.$or.some(f => {
            const field = Object.keys(f)[0];
            const regex = f[field];
            return regex.test(m[field]);
          })
        );
      }
      return {
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: async () => filtered
            })
          })
        })
      };
    };

    ContactMessage.countDocuments = async (filter) => {
      let count = 0;
      if (!filter || Object.keys(filter).length === 0) {
        count = testMessages.length;
      } else if (filter.status === 'NEW') {
        count = testMessages.filter(m => m.status === 'NEW').length;
      } else if (filter.status) {
        count = testMessages.filter(m => m.status === filter.status).length;
      }
      return count;
    };

    ContactMessage.findById = async (id) => {
      return testMessages.find(m => String(m._id) === String(id)) || null;
    };

    ContactMessage.findByIdAndUpdate = async (id, update) => {
      const msg = testMessages.find(m => String(m._id) === String(id));
      if (msg && update.status) {
        msg.status = update.status;
      }
      return msg || null;
    };

    // 4a. List messages as ADMIN
    {
      const req = {
        query: { status: 'NEW' },
        user: adminUser
      };
      let resData = null;
      const res = {
        status: () => res,
        json: (d) => { resData = d; return res; }
      };

      await contactController.getContactMessages(req, res);
      assert.strictEqual(resData.success, true);
      assert.strictEqual(resData.messages.length, 1);
      assert.strictEqual(resData.messages[0].name, 'Tolera Desta');
      assert.strictEqual(resData.unreadCount, 1);
    }

    // 4b. GET /api/contact/:id auto-marks status as READ
    {
      const newMsg = testMessages[0];
      assert.strictEqual(newMsg.status, 'NEW');

      const req = {
        params: { id: newMsg._id.toString() },
        user: adminUser,
        app: { get: () => mockIo }
      };
      let resData = null;
      const res = {
        status: () => res,
        json: (d) => { resData = d; return res; }
      };

      await contactController.getContactMessageById(req, res);
      assert.strictEqual(resData.success, true);
      assert.strictEqual(resData.message._id.toString(), newMsg._id.toString());
      assert.strictEqual(newMsg.status, 'READ', 'getContactMessageById must automatically transition NEW -> READ');
    }

    // 4c. Update status to DONE
    {
      const targetMsg = testMessages[0];
      const req = {
        params: { id: targetMsg._id.toString() },
        body: { status: 'DONE' },
        user: adminUser,
        app: { get: () => mockIo }
      };
      let resData = null;
      const res = {
        status: () => res,
        json: (d) => { resData = d; return res; }
      };

      await contactController.updateContactMessageStatus(req, res);
      assert.strictEqual(resData.success, true);
      assert.strictEqual(targetMsg.status, 'DONE');
    }

    // 4d. Delete contact message
    {
      const toDelete = testMessages[1];
      ContactMessage.findByIdAndDelete = async (id) => {
        const idx = testMessages.findIndex(m => String(m._id) === String(id));
        if (idx !== -1) return testMessages.splice(idx, 1)[0];
        return null;
      };

      const req = {
        params: { id: toDelete._id.toString() },
        user: adminUser,
        app: { get: () => mockIo }
      };
      let resData = null;
      const res = {
        status: () => res,
        json: (d) => { resData = d; return res; }
      };

      await contactController.deleteContactMessage(req, res);
      assert.strictEqual(resData.success, true);
      assert(!testMessages.some(m => String(m._id) === String(toDelete._id)));
    }
  });

  console.log('═'.repeat(65));
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log('═'.repeat(65));

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test harness failure:', err);
  process.exit(1);
});
