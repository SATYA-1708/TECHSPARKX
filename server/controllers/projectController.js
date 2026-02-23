const path = require('path');

const { projects } = require('../models/db');

const createProject = async (req, res) => {
    const { title, description, budget } = req.body;

    if (!title || !description || !budget) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    const numBudget = Number(budget);
    if (isNaN(numBudget) || numBudget <= 0) {
        return res.status(400).json({ message: 'Budget must be a valid positive number' });
    }

    const { users } = require('../models/db');
    const user = await users.findOne({ _id: req.user._id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // TOCTOU Fix: Deduct posting logic atomically
    let numUpdated = await users.update({ _id: req.user._id, freePostings: { $gt: 0 } }, { $inc: { freePostings: -1 } });
    if (numUpdated === 0) {
        numUpdated = await users.update({ _id: req.user._id, credits: { $gt: 0 } }, { $inc: { credits: -1 } });
        if (numUpdated === 0) {
            return res.status(402).json({ message: 'You need at least 1 credit or a free posting to create a project' });
        }
    }

    const project = await projects.insert({
        user: req.user._id,
        userName: req.user.name,
        userBadge: req.user.badge,
        title,
        description,
        budget: numBudget,
        bids: [],
        createdAt: new Date(),
    });

    res.status(201).json(project);
};

const getProjects = async (req, res) => {
    const allProjects = await projects.find({}).sort({ createdAt: -1 });
    res.status(200).json(allProjects);
};

const getProjectById = async (req, res) => {
    const project = await projects.findOne({ _id: req.params.id });
    if (project) {
        res.status(200).json(project);
    } else {
        res.status(404).json({ message: 'Project not found' });
    }
}

const placeBid = async (req, res) => {
    const { amount, proposal } = req.body;
    const projectId = req.params.id;

    if (!amount || !proposal) {
        return res.status(400).json({ message: 'Please add amount and proposal' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: 'Bid amount must be a valid positive number' });
    }

    const project = await projects.findOne({ _id: projectId });

    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }

    if (project.status === 'awarded') {
        return res.status(400).json({ message: 'This project has already been awarded and is closed to new bids' });
    }

    const { users } = require('../models/db');
    const user = await users.findOne({ _id: req.user._id });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // TOCTOU Fix: Deduct bid logic atomically
    let numUpdated = await users.update({ _id: req.user._id, freeBids: { $gt: 0 } }, { $inc: { freeBids: -1 } });
    if (numUpdated === 0) {
        numUpdated = await users.update({ _id: req.user._id, credits: { $gt: 0 } }, { $inc: { credits: -1 } });
        if (numUpdated === 0) {
            return res.status(402).json({ message: 'You need at least 1 credit or a free bid to place a bid' });
        }
    }

    // Prevent project owner from bidding on their own project
    if (project.user === req.user._id) {
        return res.status(400).json({ message: 'You cannot bid on your own project' });
    }

    // Prevent submitting multiple bids on the same project
    const existingBid = project.bids.find(b => b.userId === req.user._id);
    if (existingBid) {
        return res.status(400).json({ message: 'You have already submitted a bid for this project' });
    }

    const bid = {
        userId: req.user._id,
        userName: req.user.name,
        amount: numAmount,
        proposal,
        createdAt: new Date(),
    };

    await projects.update(
        { _id: projectId },
        { $push: { bids: bid } }
    );

    res.status(200).json(bid);
};

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    placeBid
};
