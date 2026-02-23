const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { escrows, projects, users, referrals } = require('../models/db');

// Multer config for payment proof images
const proofsDir = path.join(__dirname, '../uploads/proofs');
if (!fs.existsSync(proofsDir)) fs.mkdirSync(proofsDir, { recursive: true });

const proofStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, proofsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});
const proofUpload = multer({
    storage: proofStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|pdf/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = /image|pdf/.test(file.mimetype);
        if (ext && mime) cb(null, true);
        else cb(new Error('Only image or PDF files allowed'));
    },
});

/**
 * POST /api/escrow
 * Employer awards a bid → creates a project agreement with milestones.
 */
const createEscrow = async (req, res) => {
    const { projectId, freelancerId, freelancerName, amount, milestones } = req.body;

    if (!projectId || !freelancerId || !freelancerName || !amount) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: 'Escrow amount must be a positive number' });
    }

    if (!milestones || !Array.isArray(milestones) || milestones.length === 0) {
        return res.status(400).json({ message: 'At least one milestone is required' });
    }

    // Prevent self-awarding trap
    if (freelancerId === req.user._id) {
        return res.status(400).json({ message: 'You cannot award an escrow agreement to yourself' });
    }

    const project = await projects.findOne({ _id: projectId });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.user !== req.user._id) {
        return res.status(403).json({ message: 'Only the project owner can award a bid' });
    }
    if (project.status === 'awarded') {
        return res.status(400).json({ message: 'Project already awarded' });
    }

    // Prevent Silent Escrow Kidnapping / Credit Siphoning
    const hasBid = project.bids && project.bids.some(b => b.userId === freelancerId);
    if (!hasBid) {
        return res.status(400).json({ message: 'This freelancer has not formally placed a bid on your project' });
    }

    // TOCTOU Fix: Atomically check and deduct credits from both parties
    const employerUpdated = await users.update({ _id: req.user._id, credits: { $gt: 0 } }, { $inc: { credits: -1 } });
    if (employerUpdated === 0) {
        return res.status(402).json({ needsCredits: true, party: 'employer', message: 'You need at least 1 credit to create an agreement.' });
    }

    const freelancerUpdated = await users.update({ _id: freelancerId, credits: { $gt: 0 } }, { $inc: { credits: -1 } });
    if (freelancerUpdated === 0) {
        // Rollback employer if freelancer lacks credits
        await users.update({ _id: req.user._id }, { $inc: { credits: 1 } });
        return res.status(402).json({ needsCredits: true, party: 'freelancer', freelancerName, message: `${freelancerName} does not have enough credits to enter this agreement.` });
    }

    let validMilestones = true;
    const formattedMilestones = milestones.map((m, i) => {
        const mAmount = Number(m.amount);
        if (isNaN(mAmount) || mAmount <= 0) validMilestones = false;

        return {
            index: i,
            title: m.title || `Part ${i + 1}`,
            amount: mAmount,
            status: 'pending',
            taskDoneByEmployer: false,
            taskDoneByFreelancer: false,
            taskConfirmed: false,
            paidNote: '',
            proofImage: null,
            paidAt: null,
            confirmedAt: null,
        };
    });

    if (!validMilestones) {
        return res.status(400).json({ message: 'All milestone amounts must be valid positive numbers' });
    }

    const escrow = await escrows.insert({
        projectId,
        projectTitle: project.title,
        employerId: req.user._id,
        employerName: req.user.name,
        freelancerId,
        freelancerName,
        amount: numAmount,
        milestones: formattedMilestones,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await projects.update(
        { _id: projectId },
        { $set: { status: 'awarded', awardedTo: freelancerId, awardedToName: freelancerName, escrowId: escrow._id } }
    );



    res.status(201).json(escrow);
};

/**
 * GET /api/escrow
 * Returns all agreements where the logged-in user is employer OR freelancer.
 */
const getMyEscrows = async (req, res) => {
    const userId = req.user._id;
    const myEscrows = await escrows.find({
        $or: [{ employerId: userId }, { freelancerId: userId }]
    }).sort({ updatedAt: -1 });
    res.status(200).json(myEscrows);
};

/**
 * GET /api/escrow/:id
 */
const getEscrowById = async (req, res) => {
    const escrow = await escrows.findOne({ _id: req.params.id });
    if (!escrow) return res.status(404).json({ message: 'Agreement not found' });
    if (escrow.employerId !== req.user._id && escrow.freelancerId !== req.user._id) {
        return res.status(403).json({ message: 'Not authorized to view this agreement' });
    }
    res.status(200).json(escrow);
};

/**
 * PATCH /api/escrow/:id/milestone/:milestoneIndex/task-done
 * Either party marks the task as completed on their end.
 * When BOTH confirm → taskConfirmed = true → client can pay.
 */
const confirmTaskDone = async (req, res) => {
    const { id, milestoneIndex } = req.params;
    const mIdx = Number(milestoneIndex);

    const escrow = await escrows.findOne({ _id: id });
    if (!escrow) return res.status(404).json({ message: 'Agreement not found' });

    if (escrow.employerId !== req.user._id && escrow.freelancerId !== req.user._id) {
        return res.status(403).json({ message: 'Not authorized' });
    }
    if (escrow.status !== 'active') {
        return res.status(400).json({ message: `Cannot modify a milestone while the agreement is ${escrow.status}` });
    }
    if (!escrow.milestones || mIdx < 0 || mIdx >= escrow.milestones.length) {
        return res.status(400).json({ message: 'Invalid milestone index' });
    }

    const milestone = { ...escrow.milestones[mIdx] };

    if (milestone.status !== 'pending') {
        return res.status(400).json({ message: `Cannot confirm task on a milestone that is already ${milestone.status}` });
    }

    const updateField = escrow.employerId === req.user._id ? `milestones.${mIdx}.taskDoneByEmployer` : `milestones.${mIdx}.taskDoneByFreelancer`;

    // Data Race Fix: Atomically set the specific user's confirmation flag
    await escrows.update(
        { _id: id },
        { $set: { [updateField]: true, updatedAt: new Date() } }
    );

    // Re-fetch to atomically check the state combined
    const updatedEscrow = await escrows.findOne({ _id: id });
    const updatedMilestone = updatedEscrow.milestones[mIdx];

    if (updatedMilestone.taskDoneByEmployer && updatedMilestone.taskDoneByFreelancer && !updatedMilestone.taskConfirmed) {
        await escrows.update(
            { _id: id, [`milestones.${mIdx}.taskConfirmed`]: false },
            { $set: { [`milestones.${mIdx}.taskConfirmed`]: true } }
        );
    }

    const finalEscrow = await escrows.findOne({ _id: id });
    res.status(200).json(finalEscrow);
};

/**
 * PATCH /api/escrow/:id/milestone/:milestoneIndex/paid
 * Client marks a milestone as paid. Accepts multipart/form-data with optional proof image.
 * Fields: note (text), proofImage (file)
 */
const markMilestonePaid = async (req, res) => {
    const { id, milestoneIndex } = req.params;
    const mIdx = Number(milestoneIndex);

    const escrow = await escrows.findOne({ _id: id });
    if (!escrow) return res.status(404).json({ message: 'Agreement not found' });

    if (escrow.employerId !== req.user._id) {
        return res.status(403).json({ message: 'Only the client can mark payment as sent' });
    }
    if (escrow.status !== 'active') {
        return res.status(400).json({ message: `Cannot modify a milestone while the agreement is ${escrow.status}` });
    }
    if (!escrow.milestones || mIdx < 0 || mIdx >= escrow.milestones.length) {
        return res.status(400).json({ message: 'Invalid milestone index' });
    }

    const milestone = escrow.milestones[mIdx];
    if (milestone.status !== 'pending') {
        return res.status(400).json({ message: `Milestone already ${milestone.status}` });
    }
    if (!milestone.taskConfirmed) {
        return res.status(400).json({ message: 'Both parties must confirm task completion before payment' });
    }

    const proofImageUrl = req.file ? `/uploads/proofs/${req.file.filename}` : null;

    // Data Race Fix: Use atomic $set on the specific milestone array index
    await escrows.update(
        { _id: id },
        {
            $set: {
                [`milestones.${mIdx}.status`]: 'paid',
                [`milestones.${mIdx}.paidNote`]: req.body.note || '',
                [`milestones.${mIdx}.proofImage`]: proofImageUrl,
                [`milestones.${mIdx}.paidAt`]: new Date(),
                updatedAt: new Date()
            }
        }
    );

    const updatedEscrow = await escrows.findOne({ _id: id });
    res.status(200).json(updatedEscrow);
};

/**
 * PATCH /api/escrow/:id/milestone/:milestoneIndex/confirm
 * Freelancer confirms they received payment for this milestone.
 */
const confirmMilestoneReceived = async (req, res) => {
    const { id, milestoneIndex } = req.params;
    const mIdx = Number(milestoneIndex);

    const escrow = await escrows.findOne({ _id: id });
    if (!escrow) return res.status(404).json({ message: 'Agreement not found' });

    if (escrow.freelancerId !== req.user._id) {
        return res.status(403).json({ message: 'Only the freelancer can confirm receipt' });
    }
    if (escrow.status !== 'active') {
        return res.status(400).json({ message: `Cannot modify a milestone while the agreement is ${escrow.status}` });
    }
    if (!escrow.milestones || mIdx < 0 || mIdx >= escrow.milestones.length) {
        return res.status(400).json({ message: 'Invalid milestone index' });
    }

    const milestone = escrow.milestones[mIdx];
    if (milestone.status !== 'paid') {
        return res.status(400).json({ message: 'Client has not marked this milestone as paid yet' });
    }

    // Data Race Fix: Atomic update
    await escrows.update(
        { _id: id },
        {
            $set: {
                [`milestones.${mIdx}.status`]: 'confirmed',
                [`milestones.${mIdx}.confirmedAt`]: new Date(),
                updatedAt: new Date()
            }
        }
    );

    const updatedEscrow = await escrows.findOne({ _id: id });

    // If all milestones confirmed → agreement completed
    const allConfirmed = updatedEscrow.milestones.every(m => m.status === 'confirmed');
    if (allConfirmed) {
        await escrows.update({ _id: id }, { $set: { status: 'completed' } });
        updatedEscrow.status = 'completed';

        // Referral reward logic
        try {
            const freelancer = await users.findOne({ _id: updatedEscrow.freelancerId });
            if (freelancer && freelancer.referredByUserId) {
                const previousCompleted = await escrows.find({
                    freelancerId: freelancer._id,
                    status: 'completed',
                    _id: { $ne: updatedEscrow._id }
                });
                if (previousCompleted.length === 0) {
                    const referral = await referrals.findOne({
                        referrerId: freelancer.referredByUserId,
                        referredUserId: freelancer._id,
                        status: 'pending'
                    });
                    if (referral) {
                        await referrals.update(
                            { _id: referral._id },
                            { $set: { status: 'rewarded', rewardType: 'credit', rewardedAt: new Date() } }
                        );
                        await users.update({ _id: freelancer.referredByUserId }, { $inc: { referralCredits: 1 } });
                        await users.update({ _id: freelancer._id }, { $inc: { referralCredits: 1 } });
                    }
                }
            }
        } catch (refErr) {
            console.error('Referral reward error:', refErr);
        }
    }

    res.status(200).json(updatedEscrow);
};

/**
 * PATCH /api/escrow/:id/dispute
 * Either party can raise a dispute.
 */
const raiseDispute = async (req, res) => {
    const escrow = await escrows.findOne({ _id: req.params.id });
    if (!escrow) return res.status(404).json({ message: 'Agreement not found' });

    if (escrow.employerId !== req.user._id && escrow.freelancerId !== req.user._id) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    if (escrow.status === 'completed' || escrow.status === 'disputed') {
        return res.status(400).json({ message: `Cannot dispute an agreement that is already ${escrow.status}` });
    }

    escrow.status = 'disputed';
    escrow.updatedAt = new Date();
    await escrows.update({ _id: escrow._id }, escrow);
    res.status(200).json(escrow);
};

module.exports = {
    createEscrow,
    getMyEscrows,
    getEscrowById,
    confirmTaskDone,
    markMilestonePaid,
    confirmMilestoneReceived,
    raiseDispute,
    proofUpload,
};
