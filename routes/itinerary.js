/**
 * Itinerary Routes
 * RESTful API endpoints for itinerary operations
 */

const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const ItineraryController = require('../controllers/itineraryController');

const controller = new ItineraryController();

// All routes require authentication
router.use(verifyToken);

/**
 * GENERATE & BROWSE
 */

// Generate new itinerary using AI
router.post('/generate', (req, res) => controller.generateItinerary(req, res));

// Browse public itineraries
router.get('/public/browse', (req, res) =>
  controller.browsePublicItineraries(req, res)
);

/**
 * CRUD OPERATIONS
 */

// Get user's itineraries
router.get('/user/mine', (req, res) =>
  controller.getUserItineraries(req, res)
);

// Get single itinerary
router.get('/:id', (req, res) => controller.getItinerary(req, res));

// Update itinerary
router.put('/:id', (req, res) => controller.updateItinerary(req, res));

// Delete itinerary
router.delete('/:id', (req, res) => controller.deleteItinerary(req, res));

/**
 * ACTIVITY OPERATIONS
 */

// Add activity to itinerary
router.post('/:id/activity', (req, res) => controller.addActivity(req, res));

// Remove activity from itinerary
router.delete('/:id/activity/:activityId', (req, res) =>
  controller.removeActivity(req, res)
);

// Update activity in itinerary
router.patch('/:id/activity/:activityId', (req, res) =>
  controller.updateActivity(req, res)
);

/**
 * COLLABORATION & SHARING
 */

// Share itinerary with another user
router.post('/:id/share', (req, res) =>
  controller.shareItinerary(req, res)
);

// Like/Unlike itinerary
router.post('/:id/like', (req, res) => controller.toggleLike(req, res));

/**
 * TEMPLATES & CLONING
 */

// Duplicate/Fork itinerary
router.post('/:id/duplicate', (req, res) =>
  controller.duplicateItinerary(req, res)
);

/**
 * EXPORT
 */

// Export as PDF
router.get('/:id/export/pdf', (req, res) =>
  controller.exportPDF(req, res)
);

// Export as HTML
router.get('/:id/export/html', (req, res) =>
  controller.exportHTML(req, res)
);

// Export as ICS Calendar
router.get('/:id/export/ics', (req, res) =>
  controller.exportICS(req, res)
);

module.exports = router;
