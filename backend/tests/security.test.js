process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-security-secret-key-32-chars-long';

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const User = require('../models/User');
const Contribution = require('../models/Contribution');
const Notification = require('../models/Notification');
const ContactMessage = require('../models/ContactMessage');
const AuditLog = require('../models/AuditLog');

// Stub AuditLog to avoid unhandled DB buffering in tests
AuditLog.create = jest.fn().mockResolvedValue({});

const { app } = require('../server');

// Helper to generate a valid test token
const makeToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('WQG Platform Security Test Suite', () => {
  let memberUser;
  let adminUser;
  let collectorUser;
  let memberToken;
  let adminToken;
  let collectorToken;

  beforeAll(() => {
    memberUser = {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Abebe Member',
      role: 'MEMBER',
      address: { city: 'Finfinnee', kebele: '04', phone: '+251911111111' },
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockUntil: null
    };

    adminUser = {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Admin Chala',
      role: 'ADMIN',
      address: { city: 'Finfinnee', kebele: '05', phone: '+251922222222' },
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockUntil: null
    };

    collectorUser = {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Collector Tolera',
      role: 'COLLECTOR',
      address: { city: 'Finfinnee', kebele: '06', phone: '+251933333333' },
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockUntil: null
    };

    memberToken = makeToken(memberUser);
    adminToken = makeToken(adminUser);
    collectorToken = makeToken(collectorUser);
  });

  beforeEach(() => {
    // Default User.findById mock implementation
    User.findById = jest.fn().mockImplementation((id) => {
      const idStr = id?.toString();
      if (idStr === memberUser._id.toString()) return Promise.resolve(memberUser);
      if (idStr === adminUser._id.toString()) return Promise.resolve(adminUser);
      if (idStr === collectorUser._id.toString()) return Promise.resolve(collectorUser);
      return Promise.resolve(null);
    });
  });

  // =========================================================================
  // 1. 401 Without Token
  // =========================================================================
  test('1. 401 Unauthorized returned when requesting protected endpoints without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/token/i);
  });

  // =========================================================================
  // 2. 403 For Wrong Role
  // =========================================================================
  test('2. 403 Forbidden returned when user has wrong role', async () => {
    const res = await request(app)
      .get('/api/contact')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Forbidden|not authorized/i);
  });

  // =========================================================================
  // 3. Role Escalation Blocked
  // =========================================================================
  test('3a. Role escalation blocked during public registration', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockImplementation(async (doc) => ({
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      toObject: () => doc
    }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Hacker Attempt',
        address: { city: 'Adama', kebele: '01', phone: '+251900000099' },
        password: 'Password123!',
        role: 'SUPER_ADMIN' // Attempt privilege escalation
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('MEMBER'); // Must be coerced strictly to MEMBER
  });

  test('3b. Role and credential escalation blocked during profile update', async () => {
    const mockUserDoc = {
      ...memberUser,
      save: jest.fn().mockResolvedValue(true)
    };
    User.findById = jest.fn().mockResolvedValue(mockUserDoc);

    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fullName: 'Updated Name',
        role: 'SUPER_ADMIN', // Ignored
        tokenVersion: 999, // Ignored
        passwordHash: 'injected_hash' // Ignored
      });

    expect(res.status).toBe(200);
    expect(mockUserDoc.role).toBe('MEMBER'); // Role is not changed
    expect(mockUserDoc.tokenVersion).toBe(0); // tokenVersion is not overwritten
  });

  // =========================================================================
  // 4. Reading Another User's Data Blocked
  // =========================================================================
  test('4. Member is blocked from reading another member\'s contribution record', async () => {
    const anotherMemberId = new mongoose.Types.ObjectId();
    const otherContribution = {
      _id: new mongoose.Types.ObjectId(),
      member: { _id: anotherMemberId, fullName: 'Other Member' },
      amount: 500,
      receiptNumber: 'WQG-2026-PRIV'
    };

    Contribution.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(otherContribution)
        })
      })
    });

    const res = await request(app)
      .get(`/api/contributions/${otherContribution._id}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not authorized|Access denied/i);
  });

  // =========================================================================
  // 5. NoSQL Injection Blocked
  // =========================================================================
  test('5. NoSQL injection operators ($gt, $ne, $where) are stripped and rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: { $gt: '' },
        password: { $gt: '' }
      });

    // noSqlSanitize strips '$gt', leaving empty objects which fail validation
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // =========================================================================
  // 6. Brute-Force Lockout
  // =========================================================================
  test('6. Account is locked after 5 failed login attempts', async () => {
    const targetUser = {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Lockout Test',
      address: { phone: '+251911999888' },
      passwordHash: await bcrypt.hash('CorrectPassword123!', 10),
      failedLoginAttempts: 4,
      lockUntil: null,
      comparePassword: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      })
    };

    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(targetUser)
    });

    // 5th failed login attempt
    const res5 = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '+251911999888',
        password: 'WrongPassword'
      });

    expect(res5.status).toBe(401);
    expect(targetUser.failedLoginAttempts).toBe(5);
    expect(targetUser.lockUntil).not.toBeNull();
    expect(targetUser.lockUntil.getTime()).toBeGreaterThan(Date.now());

    // 6th attempt while locked returns 429
    const res6 = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '+251911999888',
        password: 'WrongPassword'
      });

    expect(res6.status).toBe(429);
    expect(res6.body.message).toMatch(/temporarily locked/i);
  });

  // =========================================================================
  // 7. XSS Payloads Stored and Returned as Plain Text
  // =========================================================================
  test('7. XSS payloads are stored as literal plain text with nosniff headers', async () => {
    const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
    let savedMsg = null;

    ContactMessage.create = jest.fn().mockImplementation(async (data) => {
      savedMsg = { _id: new mongoose.Types.ObjectId(), ...data };
      return savedMsg;
    });
    Notification.create = jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), toObject: () => ({}) });

    const res = await request(app)
      .post('/api/contact')
      .send({
        name: 'Tester',
        contact: 'test@example.com',
        message: xssPayload
      });

    expect(res.status).toBe(201);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(savedMsg.message).toBe(xssPayload); // Stored as literal text, never executed
  });

  // =========================================================================
  // 8. Upload Rejection (Signature, Size, Type)
  // =========================================================================
  test('8. Upload rejected when file signature is fake (executable pretending to be PNG)', async () => {
    const fakePngPath = path.join(__dirname, 'fake-image.png');
    // Write fake binary script content (not PNG magic bytes)
    fs.writeFileSync(fakePngPath, '#!/bin/bash\necho "Malicious payload"\n');

    try {
      const res = await request(app)
        .post('/api/auth/avatar')
        .set('Authorization', `Bearer ${memberToken}`)
        .attach('avatar', fakePngPath);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/signature/i);
    } finally {
      if (fs.existsSync(fakePngPath)) fs.unlinkSync(fakePngPath);
    }
  });

  // =========================================================================
  // 9. Payment Self-Approval and Duplicate Reference Blocked
  // =========================================================================
  test('9a. Payment self-approval is blocked with 403', async () => {
    // Collector tries to approve a payment where they are the member
    const selfPayment = {
      _id: new mongoose.Types.ObjectId(),
      member: collectorUser._id, // same as current user
      status: 'PENDING',
      amount: 1000
    };

    Contribution.findById = jest.fn().mockResolvedValue(selfPayment);

    const res = await request(app)
      .patch(`/api/contributions/${selfPayment._id}/approve`)
      .set('Authorization', `Bearer ${collectorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Conflict of interest|ofii keessanii/i);
  });

  test('9b. Duplicate transaction reference is rejected with 400', async () => {
    // An existing contribution with reference 'FT2345678' already exists
    Contribution.findOne = jest.fn().mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      transactionRef: 'FT2345678',
      paymentMethod: 'TELEBIRR'
    });

    const res = await request(app)
      .post('/api/contributions/submit')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        type: 'MONTHLY',
        amount: 200,
        paymentMethod: 'TELEBIRR',
        transactionRef: 'FT2345678'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already been used|kanaan dura/i);
  });

  test('9c. Non-positive amount is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/contributions/submit')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        type: 'MONTHLY',
        amount: 0,
        paymentMethod: 'TELEBIRR',
        transactionRef: 'FT999999'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/greater than 0|0 caaluu/i);
  });

  // =========================================================================
  // 10. Member Cannot See Contact Notifications
  // =========================================================================
  test('10. Member cannot retrieve admin contact notifications', async () => {
    const notificationsInDb = [
      {
        _id: new mongoose.Types.ObjectId(),
        title: { en: 'Church Event' },
        message: { en: 'Upcoming Fellowship' },
        audience: [], // Public to all
        readBy: [],
        createdAt: new Date()
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: { en: 'New contact message' },
        message: { en: 'Inquiry details' },
        type: 'CONTACT_MESSAGE',
        audience: ['SUPER_ADMIN', 'ADMIN'], // Restricted to Admins
        readBy: [],
        createdAt: new Date()
      }
    ];

    Notification.find = jest.fn().mockImplementation((query) => {
      let filtered = [...notificationsInDb];
      if (query.$or) {
        filtered = filtered.filter((n) => {
          return query.$or.some((clause) => {
            if (clause.audience && clause.audience.$size === 0) {
              return Array.isArray(n.audience) && n.audience.length === 0;
            }
            if (clause.audience && typeof clause.audience === 'string') {
              return Array.isArray(n.audience) && n.audience.includes(clause.audience);
            }
            return false;
          });
        });
      }
      return {
        sort: () => ({
          limit: () => ({
            lean: async () => filtered
          })
        })
      };
    });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Member should only see the 1 general notification, never the contact message notification
    expect(res.body.notifications.length).toBe(1);
    expect(res.body.notifications[0].type).not.toBe('CONTACT_MESSAGE');
  });
});
