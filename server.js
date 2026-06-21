const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// API Key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'CarLens Backend is running', timestamp: new Date() });
});

// Main endpoint for car analysis
app.post('/api/analyze-car', async (req, res) => {
  try {
    const { image } = req.body;

    // Validate input
    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Call Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: image, // base64 string from Flutter
                },
              },
              {
                text: 'What car is this? Identify the make, model, year, and any notable features. Be concise.',
              },
            ],
          },
        ],
      }),
    });

    const data = await geminiResponse.json();

    // Check for Gemini API errors
    if (!geminiResponse.ok) {
      console.error('Gemini API error:', data);
      return res.status(geminiResponse.status).json({
        error: 'Failed to analyze image',
        details: data,
      });
    }

    // Extract text response
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return res.status(200).json({
        result: 'Could not identify the car. Please try another image.',
      });
    }

    // Return result to Flutter app
    res.json({
      result: textContent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Backend error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CarLens backend running on port ${PORT}`);
});
