const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { messages, users } = require('../models/db');

// Multer config
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedExtensions = /jpeg|jpg|png|gif|webp|pdf|txt|csv|doc|docx/;
        const ext = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
        const mimeMatches = /image|pdf|text|msword|officedocument/.test(file.mimetype);
        if (ext && mimeMatches) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
        }
    }
});

const sendMessage = async (req, res) => {
    console.log('sendMessage called. Body:', req.body, 'File:', req.file);
    const { receiverId, content } = req.body;

    if (!receiverId || (!content && !req.file)) {
        return res.status(400).json({ message: 'Please provide receiverId and content or a file' });
    }

    const msgData = {
        senderId: req.user._id,
        receiverId,
        content: content || '',
        createdAt: new Date(),
        read: false,
    };

    // If file was uploaded, attach file info
    if (req.file) {
        msgData.file = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
        };
    }

    const message = await messages.insert(msgData);
    res.status(201).json(message);
};

const getMessages = async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await messages.find({
        $or: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId },
        ]
    }).sort({ createdAt: 1 });

    res.status(200).json(conversation);
};

const getConversations = async (req, res) => {
    const currentUserId = req.user._id;

    const allMyMessages = await messages.find({
        $or: [
            { senderId: currentUserId },
            { receiverId: currentUserId }
        ]
    });

    const userIds = new Set();
    allMyMessages.forEach(msg => {
        if (msg.senderId !== currentUserId) userIds.add(msg.senderId);
        if (msg.receiverId !== currentUserId) userIds.add(msg.receiverId);
    });

    const conversationPartners = [];
    for (const id of userIds) {
        const user = await users.findOne({ _id: id });
        if (user) {
            conversationPartners.push({
                _id: user._id,
                name: user.name,
                email: user.email,
                badge: user.badge
            });
        }
    }

    res.status(200).json(conversationPartners);
}

module.exports = {
    sendMessage,
    getMessages,
    getConversations,
    upload
};
