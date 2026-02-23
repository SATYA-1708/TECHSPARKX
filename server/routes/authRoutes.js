const express = require('express');
const router = express.Router();
const {
    registerUser, loginUser, getMe, updateProfile,
    getProfileById, uploadAvatar, uploadCover, uploadQr, profileUpload,
    purchaseBadge, getReferralInfo, claimReferralCredit, googleAuth,
    purchaseCredits, createCreditOrder, verifyCreditPayment
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/upload-avatar', protect, profileUpload.single('avatar'), uploadAvatar);
router.post('/upload-cover', protect, profileUpload.single('cover'), uploadCover);
router.post('/upload-qr', protect, profileUpload.single('qr'), uploadQr);
router.post('/purchase-badge', protect, purchaseBadge);
router.post('/purchase-credits', protect, purchaseCredits);       // mock (kept for fallback)
router.post('/create-credit-order', protect, createCreditOrder);  // Razorpay: step 1 — create order
router.post('/verify-credit-payment', protect, verifyCreditPayment); // Razorpay: step 2 — verify & credit
router.get('/referral-info', protect, getReferralInfo);
router.post('/claim-referral-credit', protect, claimReferralCredit);
router.get('/:id', getProfileById);

module.exports = router;
