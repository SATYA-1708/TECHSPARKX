const { reviews, escrows } = require('../models/db');

/**
 * POST /api/reviews
 * Body: { escrowId, rating (1-5), comment }
 * Only the employer of a released escrow can submit a review.
 */
const submitReview = async (req, res) => {
    const { escrowId, rating, comment } = req.body;

    if (!escrowId || !rating) {
        return res.status(400).json({ message: 'escrowId and rating are required' });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5 || !Number.isInteger(numRating)) {
        return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }

    // Find the escrow
    const escrow = await escrows.findOne({ _id: escrowId });
    if (!escrow) return res.status(404).json({ message: 'Escrow not found' });

    // Must be completed (all milestones paid and confirmed)
    if (escrow.status !== 'completed') {
        return res.status(400).json({ message: 'Can only review after all milestones are completed' });
    }

    // Only employer can review
    if (escrow.employerId !== req.user._id) {
        return res.status(403).json({ message: 'Only the employer can submit a review' });
    }

    // Check if already reviewed
    const existing = await reviews.findOne({ escrowId });
    if (existing) {
        return res.status(400).json({ message: 'You have already reviewed this escrow' });
    }

    const review = await reviews.insert({
        escrowId,
        projectId: escrow.projectId,
        projectTitle: escrow.projectTitle,
        reviewerId: req.user._id,
        reviewerName: req.user.name,
        freelancerId: escrow.freelancerId,
        freelancerName: escrow.freelancerName,
        amount: escrow.amount,
        rating: numRating,
        comment: comment ? comment.trim() : '',
        createdAt: new Date(),
    });

    res.status(201).json(review);
};

/**
 * GET /api/reviews/:userId
 * Public endpoint — returns all reviews for a user (as freelancer), sorted newest first.
 */
const getReviewsForUser = async (req, res) => {
    const userId = req.params.userId;
    const userReviews = await reviews.find({ freelancerId: userId }).sort({ createdAt: -1 });
    res.status(200).json(userReviews);
};

module.exports = { submitReview, getReviewsForUser };
