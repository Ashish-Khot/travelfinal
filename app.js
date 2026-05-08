require('dotenv').config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRouter = require("./routes/auth");
const guideProfileRouter = require('./routes/guideProfile');

const guideRouter = require('./routes/guide');
const bookingRouter = require('./routes/booking');
const adminGuideRouter = require('./routes/adminGuide');
const adminUserRouter = require('./routes/adminUser');

const adminDashboardRouter = require('./routes/adminDashboard');
const chatRoutes = require('./routes/chat');
const notificationsRoutes = require('./routes/notifications');
const travelogueRouter = require('./routes/travelogue');
const destinationRouter = require('./routes/destination');

const roomRouter = require('./routes/room');
const hotelRouter = require('./routes/hotel');
const hotelBookingRouter = require('./routes/hotelBooking');
const hotelReviewRouter = require('./routes/hotelReview');
const hotelProfileRouter = require('./routes/hotelProfile');
const hotelCustomerIntelligenceRouter = require('./routes/hotelCustomerIntelligence');
const hotelReportsRouter = require('./routes/hotelReports');
const adminTravelogueRouter = require('./routes/adminTravelogue');
const adminReviewRouter = require('./routes/adminReview');
const adminHotelReviewRouter = require('./routes/adminHotelReview');

const touristProfileRouter = require('./routes/touristProfile');
const touristRouter = require('./routes/tourist');
const touristAvatarRouter = require('./routes/touristAvatar');

const guideAvatarRouter = require('./routes/guideAvatar');
const opentripmapRouter = require('./routes/opentripmap');
const hotelProfileInfoRouter = require('./routes/hotelProfileInfo');
const voiceAssistantRouter = require('./routes/voiceAssistant');
const reviewRouter = require('./routes/review');
const healthRouter = require('./routes/health');
const virtualGuideRouter = require('./routes/virtualGuide');
const touristAgentRouter = require('./routes/touristAgent');
const itineraryRouter = require('./routes/itinerary');


const path = require('path');
const app = express();


connectDB();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));


app.use(express.json({ limit: '8mb' }));

// Serve uploaded travelogue media statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));
app.use('/api/touristAvatar', touristAvatarRouter); // Tourist avatar upload endpoint
app.use('/api/guideAvatar', guideAvatarRouter); // Guide avatar upload endpoint


app.use("/api", authRouter);
app.use('/api/admin', adminUserRouter); // Admin user management

app.use('/api/guide/profile', guideProfileRouter); // Authenticated guide profile routes (GET/PUT)
app.use('/api/guide', guideRouter); // Public guide routes (GET by userId, etc)
app.use('/api/booking', bookingRouter); // Booking routes
app.use('/api/adminGuide', adminGuideRouter); // Admin guide approval/rejection
app.use('/api/chat', chatRoutes); // Chat API routes
app.use('/api/notifications', notificationsRoutes); // Notifications API routes

app.use('/api/adminDashboard', adminDashboardRouter); // Admin dashboard stats
app.use('/api/travelogue', travelogueRouter); // Travelogue endpoints
app.use('/api/adminTravelogue', adminTravelogueRouter); // Admin travelogue actions
app.use('/api/adminReview', adminReviewRouter); // Admin guide review moderation
app.use('/api/adminHotelReview', adminHotelReviewRouter); // Admin hotel review moderation
app.use('/api/destination', destinationRouter); // Destination endpoints

app.use('/api/hotel', hotelRouter); // New hotel profile endpoints (separate collection)
app.use('/api/hotelBooking', hotelBookingRouter); // Hotel bookings
app.use('/api/hotelReview', hotelReviewRouter); // Hotel reviews
app.use('/api/hotelProfile', hotelProfileRouter); // (legacy, for migration)
app.use('/api/hotelCustomerIntelligence', hotelCustomerIntelligenceRouter); // Hotel customer intelligence
app.use('/api/hotelReports', hotelReportsRouter); // Hotel reports

app.use('/api/touristProfile', touristProfileRouter); // (legacy, for migration)
app.use('/api/tourist', touristRouter); // New tourist profile endpoints

app.use('/api/opentripmap', opentripmapRouter); // OpenTripMap API integration
app.use('/api/hotelProfileInfo', hotelProfileInfoRouter); // (legacy, for migration)
app.use('/api/voiceAssistant', voiceAssistantRouter); // Voice assistant endpoints
app.use('/api/health', healthRouter); // External API health checks
app.use('/api/virtual-guide', virtualGuideRouter); // Virtual guide AI chat
app.use('/api/touristAgent', touristAgentRouter); // Tourist command agent
app.use('/api/itinerary', itineraryRouter); // Itinerary planner

app.use('/api/room', roomRouter); // Hotel room endpoints
app.use('/api/review', reviewRouter); // Guide review endpoints

app.get("/", (req, res) => {
  res.send("API is running");
});

module.exports = app;
