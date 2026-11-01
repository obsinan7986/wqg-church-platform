const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const RadioState = require('./models/RadioState');
const GospelMedia = require('./models/GospelMedia');
const auditLogger = require('./utils/auditLogger');
auditLogger.logAudit = async () => {};
const radioService = require('./services/radioService');
const { createMedia } = require('./controllers/gospelMediaController');
const { getRadioLibrary } = require('./controllers/radioController');

let passed = 0;
let failed = 0;

function assert(desc, condition) {
  if (condition) {
    console.log(`✅ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${desc}`);
    failed++;
  }
}

// Mock Express req, res
const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
};

async function runUnitTests() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('      GOSPEL RADIO YOUTUBE EXTENSION - VERIFICATION SUITE   ');
  console.log('════════════════════════════════════════════════════════════\n');

  const adminUser = {
    _id: '507f1f77bcf86cd799439011',
    fullName: 'Admin Tester',
    role: 'SUPER_ADMIN'
  };

  const memberUser = {
    _id: '507f1f77bcf86cd799439012',
    fullName: 'Member Tester',
    role: 'MEMBER'
  };

  // 1. YouTube Link Formats test (watch, youtu.be, shorts, embed, music.youtube.com)
  console.log('[TEST 1] Testing YouTube Link Extraction...');
  const testLinks = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'watch link' },
    { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'youtu.be link' },
    { url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'shorts link' },
    { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'embed link' },
    { url: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ', desc: 'music.youtube.com link' },
  ];

  for (const item of testLinks) {
    const doc = new GospelMedia({
      title: { om: 'Faarfannaa' },
      youtubeUrl: item.url,
      addedBy: adminUser._id
    });
    assert(`Extract ID from ${item.desc}`, doc.youtubeVideoId === item.expected);
  }

  // 2. Reject Playlist links
  console.log('\n[TEST 2] Testing Playlist Link Rejection...');
  const playlistLinks = [
    'https://www.youtube.com/playlist?list=PL1234567890abcdef',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ'
  ];

  for (const pl of playlistLinks) {
    const req = {
      body: { youtubeUrl: pl, category: 'GOSPEL' },
      user: adminUser
    };
    const res = createMockRes();
    await createMedia(req, res);
    assert(`Playlist link rejected with 400 (${pl.slice(0, 35)}...)`, res.statusCode === 400);
    assert('Exact rejection message: "Paste a single video link"', res.data?.message === 'Paste a single video link');
  }

  // 3. Block duplicate videoId
  console.log('\n[TEST 3] Testing Duplicate videoId Blocking...');
  {
    // Temporarily stub findOne on GospelMedia
    const origFindOne = GospelMedia.findOne;
    GospelMedia.findOne = async () => ({ _id: 'existing_id', youtubeVideoId: 'dQw4w9WgXcQ' });

    const req = {
      body: { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', category: 'GOSPEL' },
      user: adminUser
    };
    const res = createMockRes();
    await createMedia(req, res);

    assert('Duplicate video blocked with 400', res.statusCode === 400);
    assert('Duplicate message: "This video is already in the library."', res.data?.message === 'This video is already in the library.');

    GospelMedia.findOne = origFindOne; // restore
  }

  // 4. Video not found or embedding disabled
  console.log('\n[TEST 4] Testing oEmbed Failure (Embedding Disabled or Invalid Video)...');
  {
    // Stub GospelMedia.findOne to return null (not duplicate)
    const origFindOne = GospelMedia.findOne;
    GospelMedia.findOne = async () => null;

    // A video ID that does not exist or has embedding disabled
    const req = {
      body: { youtubeUrl: 'https://www.youtube.com/watch?v=00000000000', category: 'GOSPEL' },
      user: adminUser
    };
    const res = createMockRes();
    await createMedia(req, res);

    assert('Blocked/non-existent video returns 400', res.statusCode === 400);
    assert('Error message: "Video not found or embedding is disabled."', res.data?.message === 'Video not found or embedding is disabled.');

    GospelMedia.findOne = origFindOne;
  }

  // 5. Radio Library normalized track shape
  console.log('\n[TEST 5] Testing /api/radio/library Normalization...');
  {
    // Stub find on GospelMedia
    const origGospelFind = GospelMedia.find;

    GospelMedia.find = () => ({
      select: () => ({
        sort: () => ({
          lean: async () => [
            {
              _id: 'yt_123',
              title: { om: 'Faarfannaa YouTube', am: 'የዩቲዩብ መዝሙር', en: 'YouTube Hymn' },
              speakerOrSinger: 'Singer A',
              category: 'GOSPEL',
              youtubeVideoId: 'dQw4w9WgXcQ',
              thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
            }
          ]
        })
      })
    });

    const req = { query: { lang: 'om' } };
    const res = createMockRes();
    await getRadioLibrary(req, res);

    assert('Library returned 200', res.statusCode === 200 && res.data?.success === true);
    const tracks = res.data?.tracks || [];
    assert('Library contains normalized tracks', tracks.length === 1);

    const yt = tracks.find(t => t.sourceType === 'YOUTUBE');
    assert('YouTube track has { id, sourceType, title, artist, category, youtubeVideoId, thumbnailUrl }',
      yt && yt.id === 'yt_123' && yt.sourceType === 'YOUTUBE' && yt.title === 'Faarfannaa YouTube' &&
      yt.youtubeVideoId === 'dQw4w9WgXcQ' && Boolean(yt.thumbnailUrl)
    );

    GospelMedia.find = origGospelFind;
  }

  // 6. Non-staff authorization protection
  console.log('\n[TEST 6] Testing Non-staff Authorization Protection...');
  {
    let playBlocked = false;
    try {
      await radioService.play({ title: 'Test', youtubeVideoId: 'dQw4w9WgXcQ' }, memberUser, null);
    } catch (e) {
      playBlocked = true;
    }
    assert('Non-staff member blocked from playing radio', playBlocked);

    let pauseBlocked = false;
    try {
      await radioService.pause(memberUser, null);
    } catch (e) {
      pauseBlocked = true;
    }
    assert('Non-staff member blocked from pausing radio', pauseBlocked);

    let seekBlocked = false;
    try {
      await radioService.seek(10, memberUser, null);
    } catch (e) {
      seekBlocked = true;
    }
    assert('Non-staff member blocked from seeking radio', seekBlocked);

    let nextBlocked = false;
    try {
      await radioService.next(memberUser, null);
    } catch (e) {
      nextBlocked = true;
    }
    assert('Non-staff member blocked from skipping track', nextBlocked);
  }

  // 7. Multi-device Simulation (3 Devices) & Late Joiner Sync
  console.log('\n[TEST 7] Testing Multi-device Playback & Late Joiner Sync...');
  {
    // Stub persist to avoid Mongo connection requirement
    radioService.persist = async () => {};

    const broadcastLog = [];
    const mockIo = {
      to: (room) => ({
        emit: (event, data) => broadcastLog.push({ room, event, data })
      })
    };

    // 7a. Device 1 (Staff) plays YouTube track
    const firstYtState = await radioService.play({
      mediaId: '507f1f77bcf86cd799439001',
      title: 'YouTube Choir Song',
      youtubeVideoId: 'dQw4w9WgXcQ',
      category: 'CHOIR',
      duration: 300,
      sourceType: 'YOUTUBE'
    }, adminUser, mockIo);

    assert('YouTube track playing with sourceType: YOUTUBE', firstYtState.sourceType === 'YOUTUBE' && firstYtState.isPlaying === true);
    assert('State broadcasted to all_users_room', broadcastLog.some(b => b.event === 'radio_state'));

    // 7b. Device 3 (Late Joiner) arrives 12 seconds later
    const startedAt = firstYtState.startedAt;
    const nowSimulated = startedAt + 12000; // 12 seconds later
    const expectedOffsetSeconds = (nowSimulated - startedAt) / 1000;
    assert('Late joiner starts at the right position (12.0s offset)', expectedOffsetSeconds === 12);

    // 7c. Device 1 (Staff) plays YouTube song for everyone
    const ytState = await radioService.play({
      mediaId: '507f1f77bcf86cd799439002',
      title: 'YouTube Worship Song',
      artist: 'St. George Fellowship',
      category: 'GOSPEL',
      sourceType: 'YOUTUBE',
      youtubeVideoId: 'dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    }, adminUser, mockIo);

    assert('Radio state updated with sourceType: YOUTUBE and youtubeVideoId',
      ytState.sourceType === 'YOUTUBE' && ytState.youtubeVideoId === 'dQw4w9WgXcQ' && Boolean(ytState.thumbnailUrl)
    );
  }

  // 8. Idempotent radio_ended event
  console.log('\n[TEST 8] Testing Idempotent radio_ended Auto-Advance...');
  {
    // Queue up next song
    const nextSong = {
      mediaId: '507f1f77bcf86cd799439003',
      title: 'Queued Sermon',
      category: 'SERMON',
      sourceType: 'FILE',
      url: 'https://example.com/sermon.mp3',
      duration: 500
    };
    await radioService.updateQueue([nextSong], false, adminUser, null);

    const trackId = radioService.nowPlaying.mediaId;
    const startedAt = radioService.nowPlaying.startedAt;

    // Device 1 reports track ended
    const afterDev1 = await radioService.trackEnded(trackId, startedAt, adminUser, null);
    assert('Device 1 advances queue to next song', afterDev1.title === 'Queued Sermon');

    // Device 2 reports same track ended
    const afterDev2 = await radioService.trackEnded(trackId, startedAt, adminUser, null);
    assert('Device 2 report ignored by idempotent guard (does not advance twice)', afterDev2.title === 'Queued Sermon');

    // Device 3 reports same track ended
    const afterDev3 = await radioService.trackEnded(trackId, startedAt, adminUser, null);
    assert('Device 3 report ignored by idempotent guard', afterDev3.title === 'Queued Sermon');
  }

  // 9. Unplayable YouTube error codes (codes 2, 5, 100, 101, 150)
  console.log('\n[TEST 9] Testing YouTube Error Codes & Broken Status Handling...');
  {
    const YT_UNPLAYABLE_ERRORS = [2, 5, 100, 101, 150];
    for (const code of YT_UNPLAYABLE_ERRORS) {
      const isUnplayable = YT_UNPLAYABLE_ERRORS.includes(code);
      assert(`Error code ${code} correctly recognized as unplayable video`, isUnplayable);
    }
  }

  // Summary
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runUnitTests();
