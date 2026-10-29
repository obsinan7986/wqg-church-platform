const Document = require('../models/Document');

// @desc    Create a new document (Minutes / Letter / Agenda / Announcement)
// @route   POST /api/documents
// @access  Private (SECRETARY, ADMIN, SUPER_ADMIN)
exports.createDocument = async (req, res) => {
  try {
    const { title, type, content, meetingDate, documentDate, attendeesCount, tags, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const docDate = documentDate || meetingDate;
    const finalDocDate = docDate ? new Date(docDate) : new Date();

    const doc = await Document.create({
      title: title.trim(),
      type: type || 'MINUTES',
      content: content.trim(),
      meetingDate: finalDocDate,
      documentDate: finalDocDate,
      attendeesCount: attendeesCount ? Number(attendeesCount) : 0,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
      status: status || 'PUBLISHED',
      author: req.user._id
    });

    await doc.populate('author', 'fullName role originChurch');

    res.status(201).json({
      success: true,
      message: 'Document saved successfully',
      document: doc
    });
  } catch (error) {
    console.error('[createDocument Error]:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save document'
    });
  }
};

// @desc    Get all documents with filters
// @route   GET /api/documents
// @access  Private (SECRETARY, ADMIN, SUPER_ADMIN)
exports.getDocuments = async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const filter = {};

    if (type && type !== 'ALL') {
      filter.type = type;
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { referenceCode: { $regex: search, $options: 'i' } }
      ];
    }

    const documents = await Document.find(filter)
      .populate('author', 'fullName role originChurch')
      .sort({ meetingDate: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    console.error('[getDocuments Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
};

// @desc    Get single document by ID
// @route   GET /api/documents/:id
// @access  Private
exports.getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).populate(
      'author',
      'fullName role originChurch department'
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.status(200).json({
      success: true,
      document: doc
    });
  } catch (error) {
    console.error('[getDocumentById Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document'
    });
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private (SECRETARY, ADMIN, SUPER_ADMIN)
exports.updateDocument = async (req, res) => {
  try {
    const { title, type, content, meetingDate, documentDate, attendeesCount, tags, status } = req.body;
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (title) doc.title = title.trim();
    if (type) doc.type = type;
    if (content) doc.content = content.trim();
    const docDate = documentDate || meetingDate;
    if (docDate) {
      doc.meetingDate = new Date(docDate);
      doc.documentDate = new Date(docDate);
    }
    if (attendeesCount !== undefined) doc.attendeesCount = Number(attendeesCount);
    if (tags) doc.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
    if (status) doc.status = status;

    await doc.save();
    await doc.populate('author', 'fullName role originChurch');

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      document: doc
    });
  } catch (error) {
    console.error('[updateDocument Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update document'
    });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private (SECRETARY, ADMIN, SUPER_ADMIN)
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    await doc.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('[deleteDocument Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
};
