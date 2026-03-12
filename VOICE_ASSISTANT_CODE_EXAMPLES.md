# 🔧 Voice Assistant - Implementation Code Examples

## 1. BACKEND: Voice Assistant Service

### File: `services/voiceAssistantService.js`

```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Guide = require("../models/Guide");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const User = require("../models/User");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

/**
 * Parse user speech using Gemini AI
 * Extracts: intent, entities, confidence
 */
async function parseSpeechCommand(userSpeech, userId) {
  try {
    // Get user context from database
    const user = await User.findById(userId);
    
    const prompt = `
You are a travel booking assistant. Analyze user speech and extract the following information:

User Profile:
- Interests: ${user.interests}
- Language: ${user.language}
- Country: ${user.country}

User Speech: "${userSpeech}"

Extract and return a JSON response with:
{
  "intent": "booking" | "review" | "travelogue" | "search" | "status" | "unknown",
  "confidence": 0-100,
  "entities": {
    "destination": "string or null",
    "activity": "string or null", // e.g., "trekking", "photography"
    "date": "string or null", // e.g., "next Sunday", "March 15"
    "priceRange": {
      "min": number or null,
      "max": number or null
    },
    "guidePreferences": {
      "language": "string or null",
      "rating": "number or null",
      "specialties": ["string"] or null
    }
  },
  "requestedAction": "string", // Describe what user wants
  "requiresConfirmation": true | false,
  "guidanceMessage": "string" // What to ask user if unclear
}

Return ONLY valid JSON, no other text.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean and parse JSON
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    
    return {
      success: true,
      ...parsed
    };
  } catch (error) {
    console.error("Error parsing speech:", error);
    return {
      success: false,
      intent: "unknown",
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Handle booking creation via voice
 */
async function handleBookingRequest(entities, userId) {
  try {
    // Validate required entities
    if (!entities.destination || !entities.date) {
      return {
        success: false,
        message: "I need destination and date to create a booking. Can you provide those?"
      };
    }

    // Search for matching guides
    const guides = await Guide.find({
      country: entities.destination,
      isApproved: true
    })
      .populate("userId", "name avatar rating")
      .limit(5)
      .sort({ rating: -1 });

    if (guides.length === 0) {
      return {
        success: false,
        message: `Sorry, no guides available in ${entities.destination} right now.`
      };
    }

    // Filter by specialties if provided
    let filteredGuides = guides;
    if (entities.activity) {
      filteredGuides = guides.filter(g => 
        g.specialties?.some(s => 
          s.toLowerCase().includes(entities.activity.toLowerCase())
        )
      );
    }

    if (filteredGuides.length === 0) {
      filteredGuides = guides; // Fallback to all guides
    }

    // Format guide suggestions
    const suggestions = filteredGuides.slice(0, 3).map((guide, idx) => ({
      rank: idx + 1,
      guideName: guide.userId.name,
      rating: guide.rating || 4.5,
      experience: guide.yearsOfExperience || 5,
      specialties: guide.specialties?.join(", "),
      pricePerDay: guide.pricePerDay || 2500
    }));

    return {
      success: true,
      action: "SELECT_GUIDE",
      suggestedGuides: suggestions,
      message: `Found ${filteredGuides.length} guides in ${entities.destination}. 
                 ${suggestions[0].guideName} has a ${suggestions[0].rating}⭐ rating. 
                 Would you like to book ${suggestions[0].guideName}?`,
      requiresConfirmation: true,
      metadata: {
        destination: entities.destination,
        date: entities.date,
        activity: entities.activity,
        selectedGuideId: filteredGuides[0]._id
      }
    };
  } catch (error) {
    console.error("Error handling booking:", error);
    return {
      success: false,
      message: "Sorry, I had trouble processing your booking request."
    };
  }
}

/**
 * Confirm and create booking
 */
async function createBookingFromVoice(metadata, userId) {
  try {
    const { selectedGuideId, destination, date, activity } = metadata;

    // Parse date (simplified - in production, use date-fns)
    const bookingDate = new Date(date);
    const endDate = new Date(bookingDate);
    endDate.setDate(endDate.getDate() + 1); // 1 day tour by default

    // Create booking
    const booking = new Booking({
      touristId: userId,
      guideId: selectedGuideId,
      startDateTime: bookingDate,
      endDateTime: endDate,
      destination: destination,
      price: 2500, // Default or negotiated
      status: "pending"
    });

    await booking.save();

    // Populate guide info for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate("guideId", "name email");

    return {
      success: true,
      message: `Booking confirmed with ${populatedBooking.guideId.name}! 
                 They'll respond within 2 hours. Full details in your dashboard.`,
      booking: {
        id: booking._id,
        guideName: populatedBooking.guideId.name,
        destination: destination,
        date: bookingDate.toDateString(),
        price: booking.price,
        status: "pending"
      }
    };
  } catch (error) {
    console.error("Error creating booking:", error);
    return {
      success: false,
      message: "Sorry, I couldn't complete the booking. Please try again."
    };
  }
}

/**
 * Handle review creation via voice
 */
async function handleReviewRequest(userSpeech, userId) {
  try {
    // Find user's most recent completed booking
    const booking = await Booking.findOne({
      touristId: userId,
      status: "completed"
    })
      .sort({ endDateTime: -1 })
      .populate("guideId", "name");

    if (!booking) {
      return {
        success: false,
        message: "You don't have any completed tours. Complete a tour first to leave a review."
      };
    }

    // Extract sentiment and rating from user speech
    const sentimentPrompt = `
Analyze this review text and extract:
1. Star rating (1-5, where sentiment is: very negative=1, negative=2, neutral=3, positive=4, very positive=5)
2. Cleaned review text (remove filler words)
3. Keywords (max 5)

Review: "${userSpeech}"

Return JSON:
{
  "rating": number,
  "cleanedReview": "string",
  "keywords": ["string"]
}
`;

    const result = await model.generateContent(sentimentPrompt);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const analysis = JSON.parse(cleanedText);

    return {
      success: true,
      action: "CONFIRM_REVIEW",
      preview: {
        guideName: booking.guideId.name,
        destination: booking.destination,
        rating: analysis.rating,
        comment: analysis.cleanedReview,
        keywords: analysis.keywords
      },
      message: `I'll give ${booking.guideId.name} a ${analysis.rating}⭐ rating 
                 for your ${booking.destination} tour. Is that correct?`,
      requiresConfirmation: true,
      metadata: {
        bookingId: booking._id,
        guideId: booking.guideId._id,
        rating: analysis.rating,
        comment: analysis.cleanedReview
      }
    };
  } catch (error) {
    console.error("Error handling review:", error);
    return {
      success: false,
      message: "I had trouble creating your review. Please try again."
    };
  }
}

/**
 * Confirm and create review
 */
async function createReviewFromVoice(metadata, userId) {
  try {
    const { bookingId, guideId, rating, comment } = metadata;

    const review = new Review({
      userId: userId,
      guideId: guideId,
      bookingId: bookingId,
      rating: rating,
      comment: comment,
      status: "approved" // Auto-approve from voice
    });

    await review.save();

    // Mark booking as reviewed
    await Booking.findByIdAndUpdate(bookingId, { reviewSubmitted: true });

    return {
      success: true,
      message: `${rating}⭐ review posted! The guide will see it in their dashboard.`,
      review: {
        id: review._id,
        rating: rating,
        comment: comment
      }
    };
  } catch (error) {
    console.error("Error creating review:", error);
    return {
      success: false,
      message: "I couldn't save your review. Please try again."
    };
  }
}

/**
 * Handle travelogue creation
 */
async function handleTravelogueRequest(userSpeech, userId) {
  try {
    // Extract destination and context from speech
    const traveloguePrompt = `
Analyze this travelogue request and extract:
1. Destination
2. Trip type (solo, family, adventure, cultural, etc.)
3. Trip duration (if mentioned)

Request: "${userSpeech}"

Return JSON:
{
  "destination": "string",
  "tripType": "string",
  "duration": "number or null"
}
`;

    const result = await model.generateContent(traveloguePrompt);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const analysis = JSON.parse(cleanedText);

    // Find matching bookings
    const bookings = await Booking.find({
      touristId: userId,
      destination: { $regex: analysis.destination, $options: "i" },
      status: { $in: ["completed", "confirmed"] }
    }).sort({ startDateTime: -1 });

    return {
      success: true,
      action: "CREATE_TRAVELOGUE",
      message: `I'll create a travelogue for your ${analysis.destination} trip. 
                You can narrate or write it. Ready to start?`,
      metadata: {
        destination: analysis.destination,
        tripType: analysis.tripType,
        duration: analysis.duration,
        linkedBookingId: bookings[0]?._id || null
      },
      requiresConfirmation: true
    };
  } catch (error) {
    console.error("Error handling travelogue:", error);
    return {
      success: false,
      message: "I had trouble understanding your travelogue request."
    };
  }
}

module.exports = {
  parseSpeechCommand,
  handleBookingRequest,
  createBookingFromVoice,
  handleReviewRequest,
  createReviewFromVoice,
  handleTravelogueRequest
};
```

---

## 2. BACKEND: Voice Assistant Controller

### File: `controllers/voiceAssistantController.js`

```javascript
const voiceService = require("../services/voiceAssistantService");
const User = require("../models/User");

/**
 * Process user speech command
 * POST /api/voiceAssistant/process-speech
 */
async function processSpeech(req, res) {
  try {
    const { transcribedText } = req.body;
    const userId = req.user.userId;

    if (!transcribedText) {
      return res.status(400).json({ message: "No speech text provided" });
    }

    // Parse the speech using Gemini
    const parsed = await voiceService.parseSpeechCommand(transcribedText, userId);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Couldn't understand. Please try again.",
        guidance: parsed.guidanceMessage
      });
    }

    let action;

    // Route to appropriate handler based on intent
    switch (parsed.intent) {
      case "booking":
        action = await voiceService.handleBookingRequest(parsed.entities, userId);
        break;

      case "review":
        action = await voiceService.handleReviewRequest(transcribedText, userId);
        break;

      case "travelogue":
        action = await voiceService.handleTravelogueRequest(transcribedText, userId);
        break;

      case "status":
        action = await handleStatusRequest(userId);
        break;

      default:
        return res.status(400).json({
          message: "I didn't understand that. Try 'book a guide' or 'create a review'."
        });
    }

    res.json({
      success: action.success,
      message: action.message,
      action: action.action,
      suggestedGuides: action.suggestedGuides || null,
      preview: action.preview || null,
      requiresConfirmation: action.requiresConfirmation || false,
      sessionId: generateSessionId(userId), // For confirmation tracking
      metadata: action.metadata || null
    });
  } catch (error) {
    console.error("Error processing speech:", error);
    res.status(500).json({
      message: "Server error processing your request",
      error: error.message
    });
  }
}

/**
 * Confirm action and execute
 * POST /api/voiceAssistant/confirm-action
 */
async function confirmAction(req, res) {
  try {
    const { action, metadata, confirmation } = req.body;
    const userId = req.user.userId;

    if (!confirmation) {
      return res.json({
        success: false,
        message: "Action cancelled. How can I help you?"
      });
    }

    let result;

    switch (action) {
      case "SELECT_GUIDE":
        result = await voiceService.createBookingFromVoice(metadata, userId);
        break;

      case "CONFIRM_REVIEW":
        result = await voiceService.createReviewFromVoice(metadata, userId);
        break;

      case "CREATE_TRAVELOGUE":
        result = await createTravelogue(metadata, userId);
        break;

      default:
        return res.status(400).json({ message: "Unknown action" });
    }

    res.json({
      success: result.success,
      message: result.message,
      data: result.booking || result.review || result.travelogue || null
    });
  } catch (error) {
    console.error("Error confirming action:", error);
    res.status(500).json({
      message: "Error executing action",
      error: error.message
    });
  }
}

/**
 * Get user's booking status
 */
async function handleStatusRequest(userId) {
  try {
    const Booking = require("../models/Booking");
    
    const bookings = await Booking.find({ touristId: userId })
      .populate("guideId", "name")
      .sort({ createdAt: -1 });

    const summary = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === "pending").length,
      confirmed: bookings.filter(b => b.status === "confirmed").length,
      completed: bookings.filter(b => b.status === "completed").length,
      cancelled: bookings.filter(b => b.status === "cancelled").length
    };

    const message = `You have ${summary.total} total bookings: 
                     ${summary.pending} pending, 
                     ${summary.confirmed} confirmed, 
                     ${summary.completed} completed.`;

    return {
      success: true,
      message: message,
      summary: summary
    };
  } catch (error) {
    console.error("Error getting status:", error);
    return {
      success: false,
      message: "Couldn't retrieve your booking status."
    };
  }
}

/**
 * Create travelogue from voice
 */
async function createTravelogue(metadata, userId) {
  try {
    const Travelogue = require("../models/Travelogue");

    const travelogue = new Travelogue({
      userId: userId,
      destination: metadata.destination,
      title: `My ${metadata.destination} Journey`,
      description: `A ${metadata.tripType} trip to ${metadata.destination}`,
      status: "draft",
      linkedBooking: metadata.linkedBookingId
    });

    await travelogue.save();

    return {
      success: true,
      message: `Travelogue created! Start narrating your ${metadata.destination} adventure. 
                You can add more details anytime.`,
      travelogue: {
        id: travelogue._id,
        destination: metadata.destination,
        title: travelogue.title
      }
    };
  } catch (error) {
    console.error("Error creating travelogue:", error);
    return {
      success: false,
      message: "Couldn't create your travelogue."
    };
  }
}

/**
 * Helper: Generate session ID for tracking
 */
function generateSessionId(userId) {
  return `${userId}-${Date.now()}`;
}

module.exports = {
  processSpeech,
  confirmAction
};
```

---

## 3. FRONTEND: React Voice Assistant Component

### File: `client/src/components/VoiceAssistant.jsx`

```javascript
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./VoiceAssistant.css";

const VoiceAssistant = ({ userId, onActionComplete }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in your browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setError(null);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + transcriptSegment);
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      // Show interim results
      if (interimTranscript) {
        console.log("Interim:", interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      setError(`Speech error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  // Start listening
  const handleStartListening = () => {
    if (recognitionRef.current) {
      setError(null);
      recognitionRef.current.start();
    }
  };

  // Stop listening
  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Send speech for processing
  const handleProcessSpeech = async () => {
    if (!transcript.trim()) {
      setError("No speech detected");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await axios.post("/api/voiceAssistant/process-speech", {
        transcribedText: transcript
      });

      setResponse(res.data);
      setSessionId(res.data.sessionId);
      setAwaitingConfirmation(res.data.requiresConfirmation);

      // Speak bot response
      speakResponse(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Error processing speech");
      console.error("Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm action
  const handleConfirmAction = async (confirmation) => {
    if (!response) return;

    try {
      const res = await axios.post("/api/voiceAssistant/confirm-action", {
        action: response.action,
        metadata: response.metadata,
        confirmation: confirmation
      });

      if (res.data.success) {
        speakResponse(res.data.message);
        onActionComplete?.(res.data);
        // Reset after success
        setTimeout(() => {
          setResponse(null);
          setTranscript("");
          setAwaitingConfirmation(false);
        }, 2000);
      } else {
        speakResponse(res.data.message);
        setResponse(null);
        setAwaitingConfirmation(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error confirming action");
    }
  };

  // Text to speech
  const speakResponse = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    synthRef.current.speak(utterance);
  };

  return (
    <div className="voice-assistant">
      <div className="va-container">
        <div className="va-header">
          <h3>🎤 Voice Assistant</h3>
        </div>

        {error && <div className="va-error">{error}</div>}

        {/* Listening State */}
        {!response && (
          <div className="va-listening">
            <button
              className={`va-microphone-btn ${isListening ? "active" : ""}`}
              onClick={isListening ? handleStopListening : handleStartListening}
              disabled={isProcessing}
            >
              {isListening ? (
                <>
                  <span className="va-pulse"></span>
                  🎙️ Listening...
                </>
              ) : (
                "🎤 Tap to Speak"
              )}
            </button>

            {transcript && (
              <div className="va-transcript">
                <p>
                  <strong>You said:</strong> "{transcript}"
                </p>
                <button
                  className="va-send-btn"
                  onClick={handleProcessSpeech}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Send"}
                </button>
              </div>
            )}

            <div className="va-examples">
              <small>Examples:</small>
              <ul>
                <li>"Book a guide for trekking in Lonavala"</li>
                <li>"Create a review for my guide"</li>
                <li>"Start a travelogue for my trip"</li>
              </ul>
            </div>
          </div>
        )}

        {/* Response State */}
        {response && !awaitingConfirmation && (
          <div className="va-response">
            <p className="va-bot-message">{response.message}</p>

            {/* Guide Suggestions */}
            {response.suggestedGuides && (
              <div className="va-suggestions">
                {response.suggestedGuides.map((guide, idx) => (
                  <div key={idx} className="va-guide-card">
                    <div className="va-guide-name">{guide.guideName}</div>
                    <div className="va-guide-rating">
                      ⭐ {guide.rating} | {guide.experience}+ years
                    </div>
                    <div className="va-guide-price">₹{guide.pricePerDay}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Review Preview */}
            {response.preview && (
              <div className="va-review-preview">
                <strong>{response.preview.guideName}</strong>
                <div className="va-review-rating">
                  Rating: {"⭐".repeat(response.preview.rating)}
                </div>
                <p>{response.preview.comment}</p>
              </div>
            )}

            <button
              className="va-reset-btn"
              onClick={() => {
                setResponse(null);
                setTranscript("");
              }}
            >
              Start Over
            </button>
          </div>
        )}

        {/* Confirmation State */}
        {response && awaitingConfirmation && (
          <div className="va-confirmation">
            <p className="va-confirm-message">{response.message}</p>
            <div className="va-action-buttons">
              <button
                className="va-confirm-yes"
                onClick={() => handleConfirmAction(true)}
              >
                ✅ Yes, Confirm
              </button>
              <button
                className="va-confirm-no"
                onClick={() => handleConfirmAction(false)}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistant;
```

---

## 4. FRONTEND: CSS Styling

### File: `client/src/components/VoiceAssistant.css`

```css
.voice-assistant {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
}

.va-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 24px;
  width: 380px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.va-header {
  color: white;
  margin-bottom: 20px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 12px;
}

.va-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

/* Error Message */
.va-error {
  background: #ff6b6b;
  color: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  animation: shake 0.3s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Microphone Button */
.va-microphone-btn {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.va-microphone-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.02);
}

.va-microphone-btn.active {
  background: #ff6b6b;
  border-color: #ff6b6b;
}

.va-pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Transcript */
.va-transcript {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  color: white;
}

.va-transcript p {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.va-send-btn {
  width: 100%;
  padding: 10px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.va-send-btn:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Examples */
.va-examples {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  margin-top: 16px;
}

.va-examples small {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.va-examples ul {
  margin: 0;
  padding-left: 20px;
}

.va-examples li {
  margin: 4px 0;
  font-style: italic;
}

/* Response */
.va-response,
.va-confirmation {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.va-bot-message {
  color: white;
  font-size: 15px;
  line-height: 1.5;
  margin: 0 0 16px 0;
}

/* Guide Suggestions */
.va-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0;
}

.va-guide-card {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 12px;
  color: white;
  border-left: 4px solid #00d4ff;
}

.va-guide-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.va-guide-rating {
  font-size: 13px;
  opacity: 0.9;
}

.va-guide-price {
  margin-top: 4px;
  font-weight: 600;
  color: #00d4ff;
}

/* Review Preview */
.va-review-preview {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 12px;
  color: white;
  margin: 16px 0;
  border-left: 4px solid #00ff88;
}

.va-review-rating {
  margin: 4px 0;
  font-size: 14px;
}

.va-review-preview p {
  margin: 8px 0 0 0;
  font-size: 14px;
  line-height: 1.4;
}

/* Confirmation Buttons */
.va-action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

.va-confirm-yes,
.va-confirm-no {
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.va-confirm-yes {
  background: #00ff88;
  color: #333;
}

.va-confirm-yes:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
}

.va-confirm-no {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
}

.va-confirm-no:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Reset Button */
.va-reset-btn {
  width: 100%;
  margin-top: 16px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.va-reset-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Responsive */
@media (max-width: 600px) {
  .voice-assistant {
    bottom: 20px;
    right: 20px;
  }

  .va-container {
    width: calc(100vw - 40px);
    max-width: 100%;
  }
}
```

---

## 5. BACKEND: Route Setup

### File: `routes/voiceAssistant.js`

```javascript
const express = require("express");
const voiceController = require("../controllers/voiceAssistantController");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Process speech command
router.post(
  "/process-speech",
  verifyToken,
  authorizeRoles("tourist"),
  voiceController.processSpeech
);

// Confirm and execute action
router.post(
  "/confirm-action",
  verifyToken,
  authorizeRoles("tourist"),
  voiceController.confirmAction
);

module.exports = router;
```

---

## 6. Update Main App.js

Add this to your `app.js`:

```javascript
// Add after other route definitions
const voiceAssistantRouter = require('./routes/voiceAssistant');
app.use('/api/voiceAssistant', voiceAssistantRouter);
```

---

## Installation Requirements

### Install Gemini AI Package

```bash
npm install @google/generative-ai
```

### Add to .env

```
GEMINI_API_KEY=your_api_key_here
```

---

## Integration Points Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| Service | `services/voiceAssistantService.js` | NLU + Business Logic |
| Controller | `controllers/voiceAssistantController.js` | Request Handling |
| Routes | `routes/voiceAssistant.js` | API Endpoints |
| Component | `client/src/components/VoiceAssistant.jsx` | UI + Web Speech API |
| Styles | `client/src/components/VoiceAssistant.css` | Styling |

---

## Testing Commands

```bash
# Test phrase
"Book a trekking guide in Lonavala for next Sunday"
→ Expected: Show 3 guides, ask confirmation

# Test phrase
"5-star review for my amazing guide"
→ Expected: Extract rating=5, extract previous booking, confirm

# Test phrase
"Create a travelogue for my Goa trip"
→ Expected: Create draft travelogue, ask to start narrating
```

This is ready-to-implement code! Would you like me to start adding it to your project?
