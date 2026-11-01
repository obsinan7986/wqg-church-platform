/**
 * Verification test suite for SiteSettings and ContactMessage APIs
 */
const assert = require('assert');
const mongoose = require('mongoose');
const express = require('express');

const SiteSettings = require('./models/SiteSettings');
const ContactMessage = require('./models/ContactMessage');
const siteSettingsRoutes = require('./routes/siteSettingsRoutes');
const contactRoutes = require('./routes/contactRoutes');
const auditLogger = require('./utils/auditLogger');

const Notification = require('./models/Notification');

// Mock audit logger and notifications so it doesn't fail when disconnected
auditLogger.logAudit = async () => {};
Notification.create = async () => ({ _id: new mongoose.Types.ObjectId() });

const app = express();
app.use(express.json());

// Attach mock socket.io
const emittedEvents = [];
const mockIo = {
  emit: (event, payload) => {
    emittedEvents.push({ event, payload });
  }
};
app.set('io', mockIo);

app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/contact', contactRoutes);

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    testsFailed++;
  }
}

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
  console.log('═'.repeat(60));
  console.log('    SITE SETTINGS & CONTACT SYSTEM - UNIT TEST SUITE');
  console.log('═'.repeat(60));

  // 1. URL Domain & Scheme Validation Tests
  const { updateSiteSettings } = require('./controllers/siteSettingsController');

  await runAsyncTest('Validation: Reject javascript: scheme', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), fullName: 'Admin', role: 'ADMIN' },
      body: {
        socialLinks: [{ platform: 'FACEBOOK', url: 'javascript:alert(1)', enabled: true }]
      },
      app: { get: () => mockIo }
    };
    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await updateSiteSettings(req, res);
    assert.strictEqual(statusCode, 400);
    assert.match(responseData.message, /scheme|https/i);
  });

  await runAsyncTest('Validation: Reject non-https URL', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), fullName: 'Admin', role: 'ADMIN' },
      body: {
        socialLinks: [{ platform: 'YOUTUBE', url: 'http://youtube.com/@church', enabled: true }]
      },
      app: { get: () => mockIo }
    };
    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await updateSiteSettings(req, res);
    assert.strictEqual(statusCode, 400);
    assert.match(responseData.message, /https/i);
  });

  await runAsyncTest('Validation: Reject invalid domain for Zoom', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), fullName: 'Admin', role: 'ADMIN' },
      body: {
        liveMeeting: { platform: 'ZOOM', url: 'https://evil-site.com/zoom' }
      },
      app: { get: () => mockIo }
    };
    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await updateSiteSettings(req, res);
    assert.strictEqual(statusCode, 400);
    assert.match(responseData.message, /zoom\.us/i);
  });

  await runAsyncTest('Validation: Reject non-Google Map URL', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), fullName: 'Admin', role: 'ADMIN' },
      body: {
        mapUrl: 'https://other-maps.com/?q=addis'
      },
      app: { get: () => mockIo }
    };
    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await updateSiteSettings(req, res);
    assert.strictEqual(statusCode, 400);
    assert.match(responseData.message, /Google Maps/i);
  });

  await runAsyncTest('Validation: Reject invalid email format', async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), fullName: 'Admin', role: 'ADMIN' },
      body: {
        emails: ['not-an-email']
      },
      app: { get: () => mockIo }
    };
    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await updateSiteSettings(req, res);
    assert.strictEqual(statusCode, 400);
    assert.match(responseData.message, /Invalid email/i);
  });

  // 2. Contact Message Submission & Rate Limiting Tests
  const { submitContactMessage } = require('./controllers/contactController');

  await runAsyncTest('Contact: Honeypot silently discards spambot', async () => {
    const req = {
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: {
        name: 'Spam Bot',
        contact: 'bot@spam.com',
        message: 'Buy cheap watches',
        _gotcha: 'I am a bot'
      },
      app: { get: () => mockIo }
    };
    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await submitContactMessage(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.success, true);
  });

  await runAsyncTest('Contact: Reject empty name or message', async () => {
    const req = {
      headers: { 'x-forwarded-for': '192.168.1.100' },
      body: {
        name: '',
        contact: 'test@test.com',
        message: ''
      },
      app: { get: () => mockIo }
    };
    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await submitContactMessage(req, res);
    assert.strictEqual(statusCode, 400);
  });

  await runAsyncTest('Contact: Rate limiter blocks after 5 messages from same IP', async () => {
    const testIp = '10.0.0.99';
    let lastStatusCode = 200;

    for (let i = 0; i < 7; i++) {
      const req = {
        headers: { 'x-forwarded-for': testIp },
        body: {
          name: `User ${i}`,
          contact: `user${i}@mail.com`,
          message: `Test message ${i}`
        },
        app: { get: () => mockIo }
      };
      let code = 200;
      const res = {
        status: (c) => { code = c; return res; },
        json: () => res
      };
      // Mock ContactMessage.create
      ContactMessage.create = async () => ({ _id: new mongoose.Types.ObjectId() });
      await submitContactMessage(req, res);
      lastStatusCode = code;
    }

    assert.strictEqual(lastStatusCode, 429);
  });

  // 3. Member-Only Live Meeting Visibility Masking
  const { getContactSettings } = require('./controllers/siteSettingsController');

  await runAsyncTest('Visibility: Omit meeting secrets when visibility is MEMBERS for logged-out visitor', async () => {
    // Stub SiteSettings.findOne
    SiteSettings.findOne = async () => ({
      toObject: () => ({
        emails: ['church@gmail.com'],
        phones: ['+251911000001'],
        liveMeeting: {
          title: { om: 'Sagantaa', en: 'Fellowship' },
          platform: 'ZOOM',
          url: 'https://zoom.us/j/123456',
          meetingId: '123 456',
          passcode: '9999',
          visibility: 'MEMBERS'
        }
      })
    });

    // Unauthenticated request
    const req = { user: null };
    let responseData = null;
    const res = {
      status: () => res,
      json: (data) => { responseData = data; return res; }
    };

    await getContactSettings(req, res);
    assert.strictEqual(responseData.settings.liveMeeting.url, undefined);
    assert.strictEqual(responseData.settings.liveMeeting.meetingId, undefined);
    assert.strictEqual(responseData.settings.liveMeeting.passcode, undefined);
    assert.strictEqual(responseData.settings.liveMeeting.requiresAuth, true);
  });

  await runAsyncTest('Visibility: Include meeting secrets when visibility is MEMBERS for logged-in user', async () => {
    // Authenticated request
    const req = { user: { _id: '123', role: 'MEMBER' } };
    let responseData = null;
    const res = {
      status: () => res,
      json: (data) => { responseData = data; return res; }
    };

    await getContactSettings(req, res);
    assert.strictEqual(responseData.settings.liveMeeting.url, 'https://zoom.us/j/123456');
    assert.strictEqual(responseData.settings.liveMeeting.meetingId, '123 456');
    assert.strictEqual(responseData.settings.liveMeeting.passcode, '9999');
    assert.strictEqual(responseData.settings.liveMeeting.requiresAuth, false);
  });

  console.log('═'.repeat(60));
  console.log(`VERIFICATION SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('═'.repeat(60));

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runSuite();
