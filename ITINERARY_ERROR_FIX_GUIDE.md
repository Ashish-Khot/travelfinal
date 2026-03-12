# ✈️ Itinerary Generation Error - Complete Fix Guide

## 🔴 What Was Wrong?

You got a **500 Internal Server Error** when clicking "Generate with AI" because **required API keys were missing**.

### Error Details:
```
POST :3001/api/itinerary/generate → 500 (Internal Server Error)
Message: "Error generating itinerary"
```

---

## 🔍 Root Causes Found

### **1. ❌ Missing OpenRouter API Key (CRITICAL)**
- Location: Backend tries to call `https://openrouter.ai/api/v1/chat/completions`
- What happened: Request fails with invalid API key
- Result: AI generation fails → 500 error
- Fix: Add real API key to `.env`

### **2. ❌ Missing OpenWeather API Key**
- Location: Backend tries to call `https://api.openweathermap.org/data/2.5/forecast`
- What happened: Weather forecast fails
- Result: Itinerary with no weather data
- Fix: Add real API key to `.env`

### **3. ❌ Broken OpenTripMap Key in .env**
- Location: `.env` file line 1
- What happened: Key had Google API key concatenated to it
- Before: `OPENTRIPMAP_API_KEY=your_opentripmap_api_key_hereYOUR_EXTRA_TEXT`
- After: `OPENTRIPMAP_API_KEY=your_opentripmap_api_key_here`
- Fix: Already corrected ✅

---

## ✅ How to Fix (3 Steps)

### **Step 1: Get OpenRouter API Key (For AI)**

OpenRouter provides **50 free requests** to use Mistral AI model. Sign up:

1. Go to: https://openrouter.ai/
2. Click **Sign Up** button (top right)
3. Create account with email/password
4. After login, click your **Profile icon** (top right)
5. Select **API Keys**
6. Copy the API key shown
7. Paste into `.env`:

```ini
OPENROUTER_API_KEY=sk-or-v1-... (your actual key)
```

**Time needed:** 2-5 minutes

---

### **Step 2: Get OpenWeather API Key (For Weather)**

OpenWeatherMap provides **unlimited free requests**:

1. Go to: https://openweathermap.org/api
2. Click **Sign Up** (top right)
3. Create account
4. Click **API keys** in left menu
5. Copy the **Default** key (shown in table)
6. Paste into `.env`:

```ini
OPENWEATHER_API_KEY=... (your actual key)
```

**Time needed:** 2-5 minutes

---

### **Step 3: Restart Backend Server**

After updating `.env` with real API keys:

```bash
# Stop existing server (Ctrl+C if running)
# Then restart:
npm start
```

Or if using nodemon:
```bash
npm run dev
```

---

## 📋 What Your .env Should Look Like (After Fix)

```ini
# ==========================================
# OpenTripMap API Configuration (REQUIRED)
# ==========================================
OPENTRIPMAP_API_KEY=your_opentripmap_api_key_here

# ==========================================
# OpenRouter AI - For Itinerary Generation (REQUIRED)
# ==========================================
OPENROUTER_API_KEY=sk-or-v1-abc123... (your actual key from step 1)

# ==========================================
# OpenWeather API - For Weather Forecasts (REQUIRED)
# ==========================================
OPENWEATHER_API_KEY=abc123def456... (your actual key from step 2)

# ==========================================
# Server Configuration
# ==========================================
PORT=3001
NODE_ENV=development

# ==========================================
# Frontend Configuration
# ==========================================
VITE_API_URL=http://localhost:3001
VITE_MAP_ZOOM=5
VITE_MAP_CENTER_LAT=20.5937
VITE_MAP_CENTER_LNG=78.9629

# ... rest of .env
```

---

## 🧪 How to Test If Fix Works

1. **Start backend server:**
   ```bash
   npm start
   ```

2. **Open frontend:** http://localhost:5173/tourist-dashboard

3. **Click "Itinerary Planner" tab in sidebar**

4. **Click "New Itinerary" button** → Dialog should open with form

5. **Fill form with example:**
   - Destination: `Paris`
   - Days: `5`
   - Budget: `2000`
   - Travelers: `2`
   - Travel Style: `Moderate`
   - Interests: Check `Food`, `Museums`, `Culture`

6. **Click "🤖 Generate with AI"** button

7. **Expected results (~10-15 seconds):**
   - ✅ Loading spinner appears
   - ✅ Dialog closes after generation
   - ✅ Activities tab shows generated activities
   - ✅ Weather tab shows 5-day forecast
   - ✅ Budget dashboard shows cost breakdown

---

## 🐛 Still Getting Error? Debug Here

### **Check 1: Verify .env was loaded**
In browser console (F12), check if API calls include Authorization headers.

### **Check 2: Backend logs**
Look at server terminal output:
```
✅ Good: "Itinerary generated successfully"
❌ Bad: "AI itinerary generation error"
❌ Bad: "Error generating itinerary"
```

### **Check 3: Verify API key format**
- **OpenRouter key:** Starts with `sk-or-v1-`
- **OpenWeather key:** Alphanumeric string, ~32 characters

### **Check 4: Network tab**
Open **Developer Tools** → **Network** tab → try again
- Look for request to `:3001/api/itinerary/generate`
- Click it → see response body for exact error message

---

## 📚 API Key Sources Reference

| API | Free Tier | Link |
|-----|-----------|------|
| **OpenRouter (AI)** | 50 free requests | https://openrouter.ai/ |
| **OpenWeather** | Unlimited free | https://openweathermap.org/api |
| **OpenTripMap** | 10k requests/day | https://opentripmap.com/ |

---

## ✨ What Happens Next (After Fix)

Once API keys are set up:

1. **AI generates** 7-day activity plan for destination
2. **Weather service** fetches 5-day forecast
3. **Places service** fetches 20 top attractions
4. **Itinerary saved** to MongoDB
5. **UI auto-switches** to Activities tab showing:
   - Timeline of activities by day/hour
   - Budget breakdown per activity
   - Weather recommendations
   - Activity details with descriptions

---

## 🎯 Summary

| Issue | Status | Fix |
|-------|--------|-----|
| Missing OpenRouter API | ❌ Critical | Get from openrouter.ai → add to .env |
| Missing OpenWeather API | ❌ Critical | Get from openweathermap.org → add to .env |
| Broken OpenTripMap key | ✅ Fixed | Already corrected in .env |
| Backend not restarted | ⚠️ Do now | Run `npm start` |

---

**After completing these 3 steps, your "New Itinerary" feature will work perfectly! 🚀**
