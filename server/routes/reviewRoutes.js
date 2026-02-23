const express = require('express');
const router = express.Router();
const { submitReview, getReviewsForUser } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, submitReview);
router.get('/:userId', getReviewsForUser);

module.exports = router;
