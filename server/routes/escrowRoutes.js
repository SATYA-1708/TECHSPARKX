const express = require('express');
const router = express.Router();
const {
    createEscrow,
    getMyEscrows,
    getEscrowById,
    confirmTaskDone,
    markMilestonePaid,
    confirmMilestoneReceived,
    raiseDispute,
    proofUpload,
} = require('../controllers/escrowController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createEscrow);
router.get('/', protect, getMyEscrows);
router.get('/:id', protect, getEscrowById);
router.patch('/:id/milestone/:milestoneIndex/task-done', protect, confirmTaskDone);
router.patch('/:id/milestone/:milestoneIndex/paid', protect, proofUpload.single('proofImage'), markMilestonePaid);
router.patch('/:id/milestone/:milestoneIndex/confirm', protect, confirmMilestoneReceived);
router.patch('/:id/dispute', protect, raiseDispute);

module.exports = router;
