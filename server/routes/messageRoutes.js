const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, getConversations, upload } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

console.log('MessageRoutes loaded');

// Use multer for file uploads - it processes multipart/form-data
// For JSON requests (no file), we use a separate handler

router.post('/', protect, (req, res, next) => {
    // Check if the request is multipart (has file)
    const contentType = req.headers['content-type'] || '';
    console.log('Incoming message request:', { contentType, method: req.method, url: req.originalUrl });
    if (contentType.includes('multipart/form-data')) {
        upload.single('file')(req, res, (err) => {
            if (err) {
                return res.status(400).json({ message: 'File upload error: ' + err.message });
            }
            next();
        });
    } else {
        // JSON request, no file - body already parsed by express.json()
        next();
    }
}, sendMessage);

router.get('/conversations', protect, getConversations);
router.get('/:userId', protect, getMessages);

module.exports = router;
