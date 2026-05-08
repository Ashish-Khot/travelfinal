const { generateItinerary } = require('../services/itineraryService');
const { buildItineraryPdf } = require('../services/pdfService');

const buildInput = (body = {}) => ({
  destination: String(body.destination || '').trim(),
  startDate: String(body.startDate || '').trim(),
  endDate: String(body.endDate || '').trim(),
  interests: Array.isArray(body.interests) ? body.interests : [],
  budget: String(body.budget || 'mid').trim(),
  pace: String(body.pace || 'balanced').trim(),
  transportMode: String(body.transportMode || 'car').trim(),
  dailyStartTime: String(body.dailyStartTime || '09:00').trim(),
  dailyEndTime: String(body.dailyEndTime || '21:00').trim(),
});

const generate = async (req, res) => {
  try {
    const input = buildInput(req.body || {});
    if (!input.destination) {
      return res.status(400).json({ message: 'Destination is required.' });
    }

    const itinerary = await generateItinerary(input);
    return res.json({ itinerary, tripRequest: input });
  } catch (error) {
    console.error('[Itinerary] generate error:', error.message);
    return res.status(500).json({ message: 'Unable to generate itinerary right now.' });
  }
};

const downloadPdf = async (req, res) => {
  try {
    const itinerary = req.body?.itinerary;
    const tripRequest = req.body?.tripRequest || {};
    if (!itinerary || !Array.isArray(itinerary.days)) {
      return res.status(400).json({ message: 'Valid itinerary payload is required.' });
    }

    const pdfBuffer = await buildItineraryPdf({ itinerary, tripRequest });
    const safeDestination = String(itinerary.destination || 'trip').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="itinerary-${safeDestination}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('[Itinerary] pdf error:', error.message);
    return res.status(500).json({ message: 'Unable to generate PDF.' });
  }
};

module.exports = {
  generate,
  downloadPdf,
};
