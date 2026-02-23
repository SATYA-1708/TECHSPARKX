const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const Razorpay = require('razorpay');

const { users, referrals } = require('../models/db');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// Generate a unique referral code like REF-A3K9X2
const generateReferralCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'REF-';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
};

// Multer config for profile images
const profileUploadsDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(profileUploadsDir)) fs.mkdirSync(profileUploadsDir, { recursive: true });

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, profileUploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const profileUpload = multer({
    storage: profileStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const registerUser = async (req, res) => {
    const { name, email, password, role, referredBy } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    // Role validation check to prevent privilege escalation
    if (!['freelancer', 'employer'].includes(role.toLowerCase())) {
        return res.status(400).json({ message: 'Invalid role provided' });
    }
    const safeRole = role.toLowerCase();

    const userExists = await users.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a unique referral code for the new user
    let referralCode;
    let codeExists = true;
    while (codeExists) {
        referralCode = generateReferralCode();
        codeExists = await users.findOne({ referralCode });
    }

    const userData = {
        name,
        email,
        password: hashedPassword,
        role,
        phone: req.body.phone || '',
        referralCode,
        credits: 3,          // new users start with 3 free credits
        referralCredits: 0,
        freePostings: 0,
        freeBids: 0,
        isPhoneVerified: false,
        isEmailVerified: false,
        isAadhaarVerified: false,
    };

    // If referred by someone, store the referrer's user ID
    let referrerUser = null;
    if (referredBy) {
        referrerUser = await users.findOne({ referralCode: referredBy.toUpperCase() });
        if (referrerUser) {
            userData.referredByUserId = referrerUser._id;
        }
    }

    const user = await users.insert(userData);

    if (user) {
        // Create referral record if valid referrer
        if (referrerUser) {
            await referrals.insert({
                referrerId: referrerUser._id,
                referrerName: referrerUser.name,
                referredUserId: user._id,
                referredUserName: user.name,
                status: 'pending', // pending → rewarded
                createdAt: new Date(),
            });
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            _id: user._id,
            name: user.name,
            email: user.email,
            role: safeRole,
            referralCode: user.referralCode,
            referralCode: user.referralCode,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await users.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            bio: user.bio,
            skills: user.skills,
            hourlyRate: user.hourlyRate,
            avatar: user.avatar,
            coverImage: user.coverImage,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid credentials' });
    }
};

const getMe = async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Not authorized (GETME)" });
    res.status(200).json(req.user);
}

const updateProfile = async (req, res) => {
    const user = await users.findOne({ _id: req.user._id });

    if (user) {
        const emailToUpdate = req.body.email || user.email;

        // Check for email uniqueness if email is changing
        if (emailToUpdate !== user.email) {
            const emailExists = await users.findOne({ email: emailToUpdate });
            if (emailExists && emailExists._id !== user._id) {
                return res.status(400).json({ message: 'Email is already in use by another account' });
            }
        }

        const updatedUser = {
            ...user,
            name: req.body.name || user.name,
            email: emailToUpdate,
            bio: req.body.bio !== undefined ? req.body.bio : user.bio,
            skills: req.body.skills !== undefined ? req.body.skills : user.skills, // Fix falsy array override
            hourlyRate: req.body.hourlyRate !== undefined ? req.body.hourlyRate : user.hourlyRate, // Fix falsy 0 override
            experience: req.body.experience !== undefined ? req.body.experience : user.experience,
            upiId: req.body.upiId !== undefined ? req.body.upiId : user.upiId,
            phone: req.body.phone !== undefined ? req.body.phone : user.phone,
            aadhaarLast4: req.body.aadhaarLast4 !== undefined ? req.body.aadhaarLast4 : user.aadhaarLast4,
            isPhoneVerified: (req.body.phone && req.body.phone !== user.phone) ? false : (user.isPhoneVerified || false),
            isEmailVerified: (emailToUpdate && emailToUpdate !== user.email) ? false : (user.isEmailVerified || false),
            isAadhaarVerified: (req.body.aadhaarLast4 && req.body.aadhaarLast4 !== user.aadhaarLast4) ? false : (user.isAadhaarVerified || false),
        };

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            updatedUser.password = await bcrypt.hash(req.body.password, salt);
        }

        await users.update({ _id: user._id }, updatedUser);

        const { password, ...userWithoutPassword } = updatedUser;
        res.json({
            ...userWithoutPassword,
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

const getProfileById = async (req, res) => {
    const user = await users.findOne({ _id: req.params.id });
    if (user) {
        // CRITICAL FIX: Only return public PII-safe fields
        const safeProfile = {
            _id: user._id,
            name: user.name,
            role: user.role,
            bio: user.bio,
            skills: user.skills,
            hourlyRate: user.hourlyRate,
            experience: user.experience,
            avatar: user.avatar,
            coverImage: user.coverImage,
            badge: user.badge,
            qrImage: user.qrImage,
            upiId: user.upiId,
            isPhoneVerified: user.isPhoneVerified,
            isEmailVerified: user.isEmailVerified,
            isAadhaarVerified: user.isAadhaarVerified
        };
        res.json(safeProfile);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
        const avatarUrl = `/uploads/profiles/${req.file.filename}`;
        const user = await users.findOne({ _id: req.user._id });
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.avatar = avatarUrl;
        await users.update({ _id: user._id }, user);
        res.json({ avatar: avatarUrl });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const uploadCover = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
        const coverUrl = `/uploads/profiles/${req.file.filename}`;
        const user = await users.findOne({ _id: req.user._id });
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.coverImage = coverUrl;
        await users.update({ _id: user._id }, user);
        res.json({ coverImage: coverUrl });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const uploadQr = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
        const qrUrl = `/uploads/profiles/${req.file.filename}`;
        const user = await users.findOne({ _id: req.user._id });
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.qrImage = qrUrl;
        await users.update({ _id: user._id }, user);
        res.json({ qrImage: qrUrl });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const purchaseBadge = async (req, res) => {
    try {
        const { badgeType } = req.body; // 'Pro' or 'Expert'
        if (!['Pro', 'Expert'].includes(badgeType)) {
            return res.status(400).json({ message: 'Invalid badge type' });
        }

        // Mock payment security check: Log to console as a warning, and we could restrict this further
        // if this was a production app moving away from mock payments.
        console.warn(`[SECURITY] User ${req.user._id} used the unprotected mock badge payment endpoint to get ${badgeType}.`);

        const user = await users.findOne({ _id: req.user._id });
        if (user) {
            const subscriptionEnd = new Date();
            subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1); // 1 year from now

            const updatedUser = {
                ...user,
                badge: badgeType,
                badgeSubscriptionEnd: subscriptionEnd
            };
            await users.update({ _id: user._id }, updatedUser);
            const { password, ...userWithoutPassword } = updatedUser;
            res.json({
                ...userWithoutPassword,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getReferralInfo = async (req, res) => {
    try {
        const user = await users.findOne({ _id: req.user._id });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const myReferrals = await referrals.find({ referrerId: user._id }).sort({ createdAt: -1 });

        const totalRewarded = myReferrals.filter(r => r.status === 'rewarded').length;

        res.json({
            referralCode: user.referralCode,
            referralCredits: user.referralCredits || 0,
            freePostings: user.freePostings || 0,
            freeBids: user.freeBids || 0,
            totalRewarded,
            referrals: myReferrals.map(r => ({
                _id: r._id,
                referredUserName: r.referredUserName,
                status: r.status,
                createdAt: r.createdAt,
            })),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const claimReferralCredit = async (req, res) => {
    try {
        const { type } = req.body; // 'posting' or 'bid'
        if (type !== 'posting' && type !== 'bid') {
            return res.status(400).json({ message: 'Type must be "posting" or "bid"' });
        }

        const field = type === 'posting' ? 'freePostings' : 'freeBids';

        // TOCTOU Fix: Atomically check and deduct referral credits
        const numUpdated = await users.update(
            { _id: req.user._id, referralCredits: { $gt: 0 } },
            { $inc: { referralCredits: -1, [field]: 1 } }
        );

        if (numUpdated === 0) {
            return res.status(400).json({ message: 'No referral credits available' });
        }

        const updated = await users.findOne({ _id: req.user._id });
        res.json({
            message: `Credit redeemed! You now have 1 free ${type === 'posting' ? 'project posting' : 'bid'}.`,
            referralCredits: updated.referralCredits,
            freePostings: updated.freePostings,
            freeBids: updated.freeBids,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/auth/google
 * Verifies a Google ID token, then logs in or creates a user.
 * Body: { credential, role?, referredBy? }
 */
const googleAuth = async (req, res) => {
    try {
        const { credential, role, referredBy } = req.body;
        if (!credential) return res.status(400).json({ message: 'Google credential is required' });

        // Verify token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) return res.status(401).json({ message: 'Invalid Google token' });

        const { sub: googleId, email, name, picture } = payload;

        // Check if user already exists
        let user = await users.findOne({ $or: [{ googleId }, { email }] });

        if (user) {
            // Existing user — update googleId and avatar if missing
            if (!user.googleId || !user.avatar) {
                await users.update(
                    { _id: user._id },
                    { $set: { googleId, avatar: user.avatar || picture || '' } }
                );
                user = await users.findOne({ _id: user._id });
            }
        } else {
            // New user — require role from frontend
            if (!role || !['freelancer', 'employer'].includes(role)) {
                return res.status(202).json({ needsRole: true, email, name, picture, googleId });
            }

            // Generate unique referral code
            let referralCode;
            let codeExists = true;
            while (codeExists) {
                referralCode = generateReferralCode();
                codeExists = await users.findOne({ referralCode });
            }

            const userData = {
                name,
                email,
                password: '', // no password for Google users
                googleId,
                role,
                avatar: picture || '',
                referralCode,
                credits: 3,          // new users start with 3 free credits
                referralCredits: 0,
                freePostings: 0,
                freeBids: 0,
                isPhoneVerified: false,
                isEmailVerified: true, // Google verifies email
                isAadhaarVerified: false,
            };

            // Handle referral
            let referrerUser = null;
            if (referredBy) {
                referrerUser = await users.findOne({ referralCode: referredBy.toUpperCase() });
                if (referrerUser) userData.referredByUserId = referrerUser._id;
            }

            user = await users.insert(userData);

            if (referrerUser) {
                await referrals.insert({
                    referrerId: referrerUser._id,
                    referrerName: referrerUser.name,
                    referredUserId: user._id,
                    referredUserName: user.name,
                    status: 'pending',
                    createdAt: new Date(),
                });
            }
        }

        const { password, ...userWithoutPassword } = user;
        res.status(200).json({
            ...userWithoutPassword,
            token: generateToken(user._id),
        });
    } catch (err) {
        console.error('Google auth error:', err);
        res.status(500).json({ message: 'Google authentication failed' });
    }
};

/**
 * POST /api/auth/purchase-credits
 * Buy a credit pack. Credits are used when creating agreements.
 * Body: { pack } — 'credits_5' | 'credits_15' | 'credits_30'
 */
const CREDIT_PACKS = {
    credits_5: { amount: 5, price: 49, label: '5 Credits' },
    credits_15: { amount: 15, price: 99, label: '15 Credits' },
    credits_30: { amount: 30, price: 179, label: '30 Credits' },
};

const purchaseCredits = async (req, res) => {
    try {
        const { pack } = req.body;
        const packInfo = CREDIT_PACKS[pack];
        if (!packInfo) return res.status(400).json({ message: 'Invalid credit pack' });

        const user = await users.findOne({ _id: req.user._id });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // [SECURITY FIX] Disable mock credit minting for production
        console.warn(`[SECURITY] User ${req.user._id} attempted to use the disabled mock credit minting endpoint for pack ${pack}.`);
        return res.status(403).json({ message: 'Direct credit minting is disabled in production. Please complete the Razorpay payment flow.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * POST /api/auth/create-credit-order
 * Creates a Razorpay order for buying a credit pack.
 * Body: { pack } — 'credits_5' | 'credits_15' | 'credits_30'
 * Returns: { orderId, amount, currency, key }
 */
const createCreditOrder = async (req, res) => {
    try {
        const { pack } = req.body;
        const packInfo = CREDIT_PACKS[pack];
        if (!packInfo) return res.status(400).json({ message: 'Invalid credit pack' });

        const order = await razorpay.orders.create({
            amount: packInfo.price * 100, // Razorpay expects amount in paise (₹1 = 100 paise)
            currency: 'INR',
            receipt: `credits_${req.user._id}_${Date.now()}`,
            notes: { userId: req.user._id, pack },
        });

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
            pack,
            packLabel: packInfo.label,
        });
    } catch (err) {
        console.error('Razorpay order error:', err);
        res.status(500).json({ message: 'Could not create payment order. Check Razorpay API keys.' });
    }
};

/**
 * POST /api/auth/verify-credit-payment
 * Verifies Razorpay payment signature, then adds credits to user.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, pack }
 */
const verifyCreditPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, pack } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !pack) {
            return res.status(400).json({ message: 'Missing payment details' });
        }

        // Verify HMAC-SHA256 signature
        const expectedSig = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSig !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed — invalid signature' });
        }

        // Signature valid — add credits
        const packInfo = CREDIT_PACKS[pack];
        if (!packInfo) return res.status(400).json({ message: 'Invalid credit pack' });

        const user = await users.findOne({ _id: req.user._id });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Prevent Replay Attacks: Check if payment was already processed
        if (user.processedPayments && user.processedPayments.includes(razorpay_payment_id)) {
            return res.status(400).json({ message: 'This payment has already been processed.' });
        }

        const updatedCredits = (user.credits || 0) + packInfo.amount;

        await users.update(
            { _id: user._id },
            {
                $set: { credits: updatedCredits },
                $push: { processedPayments: razorpay_payment_id }
            }
        );
        const updated = await users.findOne({ _id: user._id });
        const { password, ...userWithoutPassword } = updated;

        res.json({
            ...userWithoutPassword,
            token: generateToken(updated._id),
            message: `✅ ${packInfo.amount} credits added successfully!`,
        });
    } catch (err) {
        console.error('Payment verification error:', err);
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    updateProfile,
    getProfileById,
    uploadAvatar,
    uploadCover,
    uploadQr,
    profileUpload,
    purchaseBadge,
    getReferralInfo,
    claimReferralCredit,
    googleAuth,
    purchaseCredits,
    CREDIT_PACKS,
    createCreditOrder,
    verifyCreditPayment,
};
