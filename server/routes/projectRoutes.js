const express = require('express');
const router = express.Router();
const { createProject, getProjects, getProjectById, placeBid } = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getProjects);
router.post('/', protect, createProject);
router.get('/:id', getProjectById);
router.post('/:id/bid', protect, placeBid);

module.exports = router;
