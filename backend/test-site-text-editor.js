const assert = require('assert');
const mongoose = require('mongoose');
const AuditLog = require('./models/AuditLog');
const SiteText = require('./models/SiteText');

// Stub AuditLog to avoid Mongo buffering wait during offline unit testing
AuditLog.create = async () => ({ _id: new mongoose.Types.ObjectId() });

const siteTextController = require('./controllers/siteTextController');

// Mock User
const mockAdminUser = {
  _id: new mongoose.Types.ObjectId(),
  fullName: 'Test Admin',
  role: 'ADMIN',
  email: 'admin@church.org'
};

const runTests = async () => {
  console.log('═'.repeat(60));
  console.log('   SITE TEXT EDITOR & AXIOS INTERCEPTOR - VERIFICATION SUITE');
  console.log('═'.repeat(60));

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${err.message}`);
      failed++;
    }
  };

  // TEST 1: Axios interceptor logic simulation
  await test('Axios interceptor: strips leading /api/ so baseURL (/api) avoids /api/api/...', () => {
    const stripSafeguard = (url) => {
      if (!url) return url;
      if (url.startsWith('/api/')) return url.replace(/^\/api\//, '/');
      if (url === '/api') return '/';
      if (url.startsWith('api/')) return url.replace(/^api\//, '/');
      return url;
    };

    assert.strictEqual(stripSafeguard('/api/site-text/about.ms1Desc'), '/site-text/about.ms1Desc');
    assert.strictEqual(stripSafeguard('/api/auth/login'), '/auth/login');
    assert.strictEqual(stripSafeguard('/api'), '/');
    assert.strictEqual(stripSafeguard('api/site-text'), '/site-text');
    assert.strictEqual(stripSafeguard('/site-text/about.ms1Desc'), '/site-text/about.ms1Desc');
    assert.strictEqual(stripSafeguard('https://api.external.com/data'), 'https://api.external.com/data');
  });

  // TEST 2: Dot in key encoding and decoding
  await test('Key encoding: dots in key (e.g. about.ms1Desc) preserved and decoded', () => {
    const testKey = 'about.ms1Desc';
    const encoded = encodeURIComponent(testKey);
    const decoded = decodeURIComponent(encoded);
    assert.strictEqual(decoded, testKey);
  });

  // TEST 3: MongoDB Schema validation - key stored as field VALUE, not field name
  await test('MongoDB Schema: key is stored as field VALUE, never field name', () => {
    const testDoc = new SiteText({
      key: 'about.ms1Desc',
      om: 'Bara 1980',
      am: 'በ1980 ዓ.ም',
      en: 'In 1980'
    });

    const obj = testDoc.toObject();
    assert.strictEqual(obj.key, 'about.ms1Desc');
    assert.strictEqual(typeof obj.key, 'string');
    // Ensure it is NOT a nested field
    assert.strictEqual(obj.about, undefined);
  });

  // TEST 4: Backend Controller - Update text in all 3 languages (om, am, en)
  await test('Controller: updateSiteText sets om, am, en for key with dots', async () => {
    const mockReq = {
      params: { key: encodeURIComponent('about.title') },
      body: {
        om: 'Waa\'ee Waldichaa Haaraa',
        am: 'አዲስ የማኅበሩ ታሪክ',
        en: 'New Church About Title'
      },
      user: mockAdminUser,
      app: { get: () => ({ emit: () => {} }) }
    };

    let statusCode = null;
    let resJson = null;
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            resJson = data;
            return data;
          }
        };
      }
    };

    // Stub SiteText.findOneAndUpdate to return query-like object with .populate()
    const originalFindOneAndUpdate = SiteText.findOneAndUpdate;
    SiteText.findOneAndUpdate = (filter, update) => {
      assert.strictEqual(filter.key, 'about.title');
      assert.strictEqual(update.$set.key, 'about.title');
      assert.strictEqual(update.$set.om, 'Waa\'ee Waldichaa Haaraa');
      assert.strictEqual(update.$set.am, 'አዲስ የማኅበሩ ታሪክ');
      assert.strictEqual(update.$set.en, 'New Church About Title');
      return {
        populate: async () => ({
          _id: new mongoose.Types.ObjectId(),
          key: filter.key,
          om: update.$set.om,
          am: update.$set.am,
          en: update.$set.en,
          updatedBy: mockAdminUser
        })
      };
    };

    try {
      await siteTextController.updateSiteText(mockReq, mockRes);
      assert.strictEqual(statusCode, 200);
      assert.strictEqual(resJson.success, true);
      assert.strictEqual(resJson.data.key, 'about.title');
      assert.strictEqual(resJson.data.om, 'Waa\'ee Waldichaa Haaraa');
      assert.strictEqual(resJson.data.am, 'አዲስ የማኅበሩ ታሪክ');
      assert.strictEqual(resJson.data.en, 'New Church About Title');
    } finally {
      SiteText.findOneAndUpdate = originalFindOneAndUpdate;
    }
  });

  // TEST 5: Controller: deleteSiteText (Reset to default)
  await test('Controller: deleteSiteText removes override and invalidates cache', async () => {
    const mockReq = {
      params: { key: encodeURIComponent('about.title') },
      user: mockAdminUser,
      app: { get: () => ({ emit: () => {} }) }
    };

    let statusCode = null;
    let resJson = null;
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            resJson = data;
            return data;
          }
        };
      }
    };

    const originalFindOneAndDelete = SiteText.findOneAndDelete;
    SiteText.findOneAndDelete = async (filter) => {
      assert.strictEqual(filter.key, 'about.title');
      return {
        key: 'about.title',
        om: 'Previous Om',
        am: 'Previous Am',
        en: 'Previous En'
      };
    };

    try {
      await siteTextController.deleteSiteText(mockReq, mockRes);
      assert.strictEqual(statusCode, 200);
      assert.strictEqual(resJson.success, true);
      assert.strictEqual(resJson.key, 'about.title');
      assert.strictEqual(resJson.wasOverridden, true);
    } finally {
      SiteText.findOneAndDelete = originalFindOneAndDelete;
    }
  });

  // TEST 6: Overridden Counter Transition (0 -> 1 -> 0)
  await test('UI Logic: Overridden counter transitions correctly from 0 to 1, then resets to 0', () => {
    const allValidKeys = ['about.title', 'about.subtitle', 'home.title'];
    let overrides = [];

    const getOverriddenCount = (currOverrides) => {
      const map = new Map();
      currOverrides.forEach(o => map.set(o.key, o));
      return allValidKeys.filter(k => map.has(k)).length;
    };

    // Step A: Initially 0
    assert.strictEqual(getOverriddenCount(overrides), 0);

    // Step B: Save override for about.title
    const newOverride = {
      key: 'about.title',
      om: 'Haaraa',
      am: 'አዲስ',
      en: 'New'
    };
    overrides = [...overrides.filter(o => o.key !== newOverride.key), newOverride];
    assert.strictEqual(getOverriddenCount(overrides), 1);

    // Step C: Reset about.title to default
    overrides = overrides.filter(o => o.key !== 'about.title');
    assert.strictEqual(getOverriddenCount(overrides), 0);
  });

  console.log('═'.repeat(60));
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('═'.repeat(60));

  if (failed > 0) process.exit(1);
};

runTests();
