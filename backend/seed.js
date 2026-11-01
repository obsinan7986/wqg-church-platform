require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const ScheduleItem = require('./models/ScheduleItem');
const { seedIfEmpty } = require('./controllers/scheduleController');

const seedUsers = [
  {
    fullName: 'Aba Gadaa Tolasaa',
    originChurch: 'Debre Tsiyoon Qulqulluu Giyoorgisii',
    address: {
      city: 'Finfinnee',
      kebele: '04',
      phone: '+251911000001'
    },
    role: 'SUPER_ADMIN',
    department: 'Supreme Council & Leadership',
    languagePref: 'om'
  },
  {
    fullName: 'Haftu Gebrekidan',
    originChurch: 'Debre Libaanos Qulqulluu Mikaa\'elii',
    address: {
      city: 'Adaamaa',
      kebele: '02',
      phone: '+251911000002'
    },
    role: 'ADMIN',
    department: 'Operations & Systems',
    languagePref: 'am'
  },
  {
    fullName: 'Caaltuu Dheeressaa',
    originChurch: 'Waldaa Amantoota Qulqulluu Giyoorgisii',
    address: {
      city: 'Bishooftuu',
      kebele: '07',
      phone: '+251911000003'
    },
    role: 'COLLECTOR',
    department: 'Finance & Treasury',
    languagePref: 'om'
  },
  {
    fullName: 'Yohannes Tadesse',
    originChurch: 'Bole Debre Saalem Medhanialem',
    address: {
      city: 'Finfinnee',
      kebele: '12',
      phone: '+251911000004'
    },
    role: 'HR',
    department: 'Human Resources & Personnel',
    languagePref: 'en'
  },
  {
    fullName: 'Burtukaan Margaa',
    originChurch: 'Qulqulluu Giyoorgisii Finfinnee',
    address: {
      city: 'Finfinnee',
      kebele: '08',
      phone: '+251911000005'
    },
    role: 'SECRETARY',
    department: 'Secretariat & Records',
    languagePref: 'om'
  },
  {
    fullName: 'Abdiisaa Mootummaa',
    originChurch: 'Waldaa Amantoota Qulqulluu Giyoorgisii',
    address: {
      city: 'Amboo',
      kebele: '01',
      phone: '+251911000006'
    },
    role: 'MEMBER',
    department: 'General Fellowship',
    languagePref: 'om'
  }
];

const seedDatabase = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('[Seed Error] MONGO_URI is not defined in backend/.env');
    process.exit(1);
  }

  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log(`[Seed] Connected to database: ${mongoose.connection.name}`);

    const DEFAULT_PASSWORD = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    const testPhones = seedUsers.map((u) => u.address.phone);
    const deleteResult = await User.deleteMany({ 'address.phone': { $in: testPhones } });
    console.log(`[Seed] Cleaned up ${deleteResult.deletedCount} existing test records.`);

    const usersToInsert = seedUsers.map((user) => ({
      ...user,
      passwordHash,
      isOnline: false
    }));

    const insertedUsers = await User.insertMany(usersToInsert);
    console.log(`[Seed] Successfully seeded ${insertedUsers.length} accounts.\n`);

    // Seed sample Notifications
    const Notification = require('./models/Notification');
    const Message = require('./models/Message');

    await Notification.deleteMany({});
    const sampleNotifications = [
      {
        title: {
          om: 'Baga Nagaan Dhuftan Wiirtuu Tajaajila Qulqulluu Giyoorgisiitti!',
          am: 'እንኳን ወደ ቅዱስ ጊዮርጊስ መንፈሳዊ አገልግሎት በደህና መጡ!',
          en: 'Welcome to St. George Spiritual Fellowship Platform!'
        },
        message: {
          om: 'Tajaajila wangeelaa, faarfannaa fi oduu haaraa waldichaa asitti hordofaa.',
          am: 'የወንጌል አገልግሎት፣ መዝሙራትና አዳዲስ መረጃዎችን እዚህ ይከታተሉ።',
          en: 'Follow our gospel ministry, hymns, and spiritual announcements here.'
        },
        type: 'ANNOUNCEMENT',
        link: '/dashboard',
        readBy: []
      },
      {
        title: {
          om: 'Sagantaa Walga\'ii Dilbata Dhufoo',
          am: 'የሚቀጥለው እሁድ መርሐ-ግብር',
          en: 'Upcoming Sunday Fellowship Schedule'
        },
        message: {
          om: 'Dilbata dhufoo sa\'aatii 3:00 irratti tajaajilli addaa ni jiraata.',
          am: 'በሚቀጥለው እሁድ ከጠዋቱ 3:00 ጀምሮ ልዩ መንፈሳዊ መርሐ-ግብር ይካሄዳል።',
          en: 'Special fellowship gathering will be held this Sunday at 9:00 AM.'
        },
        type: 'NEW_SCHEDULE',
        link: '/services',
        readBy: []
      },
      {
        title: {
          om: 'Gumaacha fi Buusii Ji\'aa',
          am: 'የወሩ መዋጮ እና አስራት ማሳሰቢያ',
          en: 'Monthly Tithe & Benevolence Collection'
        },
        message: {
          om: 'Buusii ji\'a kanaa kaffaluun tajaajila harka qalleeyyii akka deggertan isin yaadachiifna.',
          am: 'የወሩን መዋጮ በማስገባት የተቸገሩትን እንድትደግፉ በአክብሮት እናሳስባለን።',
          en: 'Please submit your monthly contribution to support our community charity work.'
        },
        type: 'PAYMENT_REMINDER',
        link: '/dashboard',
        readBy: []
      }
    ];
    await Notification.insertMany(sampleNotifications);
    console.log('[Seed] Successfully seeded 3 notifications.');

    // Seed initial Executive 5-Actors Messages
    await Message.deleteMany({});
    const superAdmin = insertedUsers.find((u) => u.role === 'SUPER_ADMIN');
    const admin = insertedUsers.find((u) => u.role === 'ADMIN');
    const secretary = insertedUsers.find((u) => u.role === 'SECRETARY');

    if (superAdmin && admin && secretary) {
      await Message.insertMany([
        {
          sender: superAdmin._id,
          channel: 'EXEC_5_ACTORS',
          content: 'Baga nagaan dhuftan hooggantoota waldichaa! Kutaa kana keessatti qaboo yaa\'ii fi marii icciitii hooggansaa raawwanna.',
          readBy: [superAdmin._id]
        },
        {
          sender: admin._id,
          channel: 'EXEC_5_ACTORS',
          content: 'Nagaan Waaqayyoo hunda keenyaaf haa baay\'atu. Qophiin sagantaa Live fi teeknoolojii xumuramaa jira.',
          readBy: [superAdmin._id, admin._id]
        },
        {
          sender: secretary._id,
          channel: 'EXEC_5_ACTORS',
          content: 'Galmeen miseensota haaraa fi beeksisoota waldichaa qindaa\'eera.',
          readBy: [superAdmin._id, admin._id, secretary._id]
        }
      ]);
      console.log('[Seed] Successfully seeded initial Executive 5-Actors conversation.');
    }

    // Seed GospelMedia
    const GospelMedia = require('./models/GospelMedia');
    await GospelMedia.deleteMany({});
    if (admin) {
      await GospelMedia.insertMany([
        {
          title: {
            om: 'Faarfannaa Qulqulluu Giyoorgisii - Yaa Giyoorgis Nuuf Lallabi',
            am: 'የቅዱስ ጊዮርጊስ መዝሙር - ቅዱስ ጊዮርጊስ ሆይ አማልደን',
            en: 'St. George Hymn - Pray for Us O Holy Martyr'
          },
          description: {
            om: 'Faarfannaa ortodoksii tawaahidoo ayyaana Qulqulluu Giyoorgisiif qophaa\'e.',
            am: 'ለቅዱስ ጊዮርጊስ በዓል የተዘጋጀ ኦርቶዶክሳዊ ዝማሬ።',
            en: 'Orthodox Tewahedo hymn in honor of St. George.'
          },
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          youtubeVideoId: 'dQw4w9WgXcQ',
          category: 'CHOIR',
          speakerOrSinger: 'Faarfataa Dargaggoota Debre Tsiyoon',
          addedBy: admin._id
        },
        {
          title: {
            om: 'Barnoota Wangeelaa: Jireenya Qulqullootaa fi Wareegamtootaa',
            am: 'የወንጌል ትምህርት፡ የቅዱሳን እና የሰማዕታት ሕይወት',
            en: 'Gospel Teaching: Life of the Saints & Martyrs'
          },
          description: {
            om: 'Lallaba fi barnoota hafuuraa maqaasaa Qulqulluu Giyoorgisii.',
            am: 'በሰማዕቱ ቅዱስ ጊዮርጊስ ጽናት ዙሪያ የተሰጠ ትምህርት።',
            en: 'Spiritual lesson on courage in faith through St. George.'
          },
          youtubeUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
          youtubeVideoId: '9bZkp7q19f0',
          category: 'SERMON',
          speakerOrSinger: 'Lallabaa Waldaa Qulqulluu Giyoorgisii',
          addedBy: admin._id
        },
        {
          title: {
            om: 'Kadhannaa fi Sagalee Waaqayyoo - Waaree Booda',
            am: 'የኅብረት ጸሎትና የእግዚአብሔር ቃል',
            en: 'Prayer and Fellowship Gathering'
          },
          description: {
            om: 'Sagantaa kadhannaa fi gorsaa hafuuraa.',
            am: 'የዕለቱ የጸሎት መርሐ-ግብር።',
            en: 'Daily evening fellowship prayer.'
          },
          youtubeUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
          youtubeVideoId: 'kJQP7kiw5Fk',
          category: 'PRAYER',
          speakerOrSinger: 'Koree Kadhannaa Waldichaa',
          addedBy: admin._id
        }
      ]);
      console.log('[Seed] Successfully seeded 3 YouTube Gospel Media items.');
    }

    // Seed Contributions
    const Contribution = require('./models/Contribution');
    const collector = insertedUsers.find((u) => u.role === 'COLLECTOR');
    const member = insertedUsers.find((u) => u.role === 'MEMBER');
    const hr = insertedUsers.find((u) => u.role === 'HR');

    await Contribution.deleteMany({});
    if (collector && member) {
      await Contribution.insertMany([
        {
          receiptNumber: 'WQG-2026-A101',
          member: member._id,
          collector: collector._id,
          type: 'MONTHLY',
          amount: 500,
          paymentMethod: 'TELEBIRR',
          originChurch: member.originChurch,
          status: 'PAID',
          notes: 'Buusii ji\'a Fulbaanaa fi Onkoloolessaa',
          paymentDate: new Date()
        },
        {
          receiptNumber: 'WQG-2026-B202',
          member: member._id,
          collector: collector._id,
          type: 'TITHE',
          amount: 1500,
          paymentMethod: 'CBE_BIRR',
          originChurch: member.originChurch,
          status: 'PAID',
          notes: 'Asraatii waldichaa',
          paymentDate: new Date(Date.now() - 86400000 * 2)
        },
        {
          receiptNumber: 'WQG-2026-C303',
          member: superAdmin._id,
          collector: collector._id,
          type: 'DONATION',
          amount: 3000,
          paymentMethod: 'BANK_TRANSFER',
          originChurch: superAdmin.originChurch,
          status: 'PAID',
          notes: 'Deggersa tajaajila Live fi miidiyaa',
          paymentDate: new Date(Date.now() - 86400000 * 5)
        }
      ]);
      console.log('[Seed] Successfully seeded 3 sample contributions.');
    }

    // Seed Documents (Secretary)
    const Document = require('./models/Document');
    await Document.deleteMany({});
    if (secretary) {
      await Document.insertMany([
        {
          title: 'Qaboo Yaa\'ii Walga\'ii Koree Hoji-raawwachiiftuu',
          referenceCode: 'DOC-2026-SEC01',
          type: 'MINUTES',
          content: 'Walga\'iin guyyaa har\'aa sa\'aatii 4:00 irratti eegalame. Ajandaawwan: 1. Qophii tajaajila Live fi WebRTC. 2. Buusii ji\'aa miseensotaa cimsuu. 3. Sirna galmee fi kaardii eenyummaa HR. Murteewwan: Tajaajilli Live akka eegalamu murtaa\'eera; nagaheen kaffaltii digitaalaa akka kennamu walii galameera.',
          meetingDate: new Date(),
          attendeesCount: 5,
          tags: ['Marii', 'Live', 'Faayinaansii'],
          author: secretary._id,
          status: 'PUBLISHED'
        },
        {
          title: 'Xalayaa Beeksisaa: Sagantaa Ayyaana Qulqulluu Giyoorgisii',
          referenceCode: 'DOC-2026-SEC02',
          type: 'OFFICIAL_LETTER',
          content: 'Kabajamtoota miseensota waldichaa hundumaaf: Ayyaana Qulqulluu Giyoorgisii ji\'a dhufoo kabajamuuf qophiin barbaachisu taasifamaa jira. Miseensonni damee hundaa hirmaannaa keessan akka cimsitan isin beeksisna.',
          meetingDate: new Date(Date.now() - 86400000 * 3),
          attendeesCount: 0,
          tags: ['Ayyaana', 'Beeksisa'],
          author: secretary._id,
          status: 'PUBLISHED'
        }
      ]);
      console.log('[Seed] Successfully seeded 2 secretary documents.');
    }

    // Seed Attendance (HR)
    const Attendance = require('./models/Attendance');
    await Attendance.deleteMany({});
    if (hr && member && superAdmin) {
      await Attendance.create({
        title: 'Walga\'ii Hafuuraa Dilbataa (Sunday Service)',
        serviceType: 'SUNDAY_SERVICE',
        originChurch: 'All Branches',
        date: new Date(),
        presentMembers: [
          { member: member._id, markedAt: new Date() },
          { member: superAdmin._id, markedAt: new Date() },
          { member: secretary._id, markedAt: new Date() }
        ],
        recordedBy: hr._id,
        notes: 'Walga\'iin haala gaariin xumurameera.'
      });
      console.log('[Seed] Successfully seeded initial HR Attendance log.');
    }

    // Seed Banners
    const Banner = require('./models/Banner');
    await Banner.deleteMany({});
    if (admin) {
      await Banner.insertMany([
        {
          title: {
            om: 'Baga Ayyaana Qulqulluu Giyoorgisiin Isin Gahe!',
            am: 'እንኳን ለሰማዕቱ ቅዱስ ጊዮርጊስ ዓመታዊ ክብረ በዓል በሰላም አደረሳችሁ!',
            en: 'Happy Annual Feast of St. George the Great Martyr!'
          },
          description: {
            om: 'Ayyaana kabajamaa wareegamtuu Qulqulluu Giyoorgisii sababeeffachuun sagantaan kadhannaa fi tajaajilli addaa ni jiraata.',
            am: 'የሰማዕቱን በረከት ለማሳተፍ የተዘጋጁ ልዩ መንፈሳዊ መርሐ-ግብሮችን በቀጥታ ይከታተሉ።',
            en: 'Join our special live spiritual program and prayers dedicated to St. George.'
          },
          imageUrl: 'https://images.unsplash.com/photo-1548625361-195fe5787a2a?auto=format&fit=crop&w=1200&q=80',
          linkUrl: '/services',
          badge: 'Ayyaana Addaa (Special Feast)',
          order: 1,
          isActive: true,
          createdBy: admin._id
        },
        {
          title: {
            om: 'Gumaacha fi Ijaarsa Gamoo Waldaa Qulqulluu Giyoorgisii',
            am: 'የቅዱስ ጊዮርጊስ ሕንፃ ግንባታ የልማት ጥሪ',
            en: 'Church Building Construction & Benevolence Campaign'
          },
          description: {
            om: 'Ijaarsa gamoo tajaajila hawaasummaa fi hafuuraa waldichaatiif hirmaannaa keessan cimsitan afeeramtanittu.',
            am: 'የቤተ-ክርስቲያኑን ሁለገብ አገልግሎት ማዕከል ለመገንባት በሚደረገው ርብርብ የበኩሎን አሻራ ያኑሩ።',
            en: 'Support the expansion of our ministry fellowship and community service center.'
          },
          imageUrl: 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?auto=format&fit=crop&w=1200&q=80',
          linkUrl: '/dashboard',
          badge: 'Gumaacha Ijaarsaa (Building Campaign)',
          order: 2,
          isActive: true,
          createdBy: admin._id
        }
      ]);
      console.log('[Seed] Successfully seeded 2 promotional banners.');
    }

    // Seed Audit Logs
    const AuditLog = require('./models/AuditLog');
    await AuditLog.deleteMany({});
    if (superAdmin && admin && collector) {
      await AuditLog.insertMany([
        {
          user: superAdmin._id,
          userName: superAdmin.fullName,
          userRole: superAdmin.role,
          action: 'LOGIN',
          details: 'Super Admin logged in from secure terminal',
          ipAddress: '127.0.0.1',
          timestamp: new Date(Date.now() - 3600000 * 5)
        },
        {
          user: superAdmin._id,
          userName: superAdmin.fullName,
          userRole: superAdmin.role,
          action: 'CREATE_MEETING',
          details: 'Scheduled Live Meeting: "Tajaajila Kallattii & Sagantaa Kadhannaa"',
          ipAddress: '127.0.0.1',
          timestamp: new Date(Date.now() - 3600000 * 4)
        },
        {
          user: admin._id,
          userName: admin.fullName,
          userRole: admin.role,
          action: 'ADD_BANNER',
          details: 'Published homepage promotional banner for St. George Feast',
          ipAddress: '192.168.1.15',
          timestamp: new Date(Date.now() - 3600000 * 3)
        },
        {
          user: collector._id,
          userName: collector.fullName,
          userRole: collector.role,
          action: 'RECORD_CONTRIBUTION',
          details: 'Recorded monthly payment of 500 ETB for Abdiisaa Mootummaa (Receipt WQG-2026-A101)',
          ipAddress: '192.168.1.20',
          timestamp: new Date(Date.now() - 3600000 * 2)
        },
        {
          user: superAdmin._id,
          userName: superAdmin.fullName,
          userRole: superAdmin.role,
          action: 'CREATE_STAFF',
          details: 'Created staff account for Secretary Burtukaan Margaa',
          ipAddress: '127.0.0.1',
          timestamp: new Date(Date.now() - 3600000 * 1)
        }
      ]);
      console.log('[Seed] Successfully seeded 5 initial audit log records.');
    }

    console.log('='.repeat(80));
    console.log('  WALDAA ANGAFA WAREEGAMTOOTA QULQULUU GIYOORGISII (WQG) - INITIAL ACCOUNTS');
    console.log('='.repeat(80));
    console.table(
      insertedUsers.map((u) => ({
        Role: u.role,
        'Full Name': u.fullName,
        'Phone (Login ID)': u.address.phone,
        Password: DEFAULT_PASSWORD,
        City: u.address.city,
        'Origin Church': u.originChurch,
        Lang: u.languagePref
      }))
    );
    console.log('='.repeat(80));

    await seedIfEmpty();
    await mongoose.connection.close();
    console.log('[Seed] Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedDatabase();
