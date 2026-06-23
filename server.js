import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Configure multer for image uploads (memory storage, 10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Middleware
app.use(cors());
app.use(express.json());

// ─── System prompts ────────────────────────────────────────────────────────────

const VERIFICATION_SYSTEM_PROMPT = `You are MedVerify, a pharmaceutical verification AI assistant. Analyze the provided medicine details and provide a comprehensive verification report. You must respond ONLY with valid JSON (no markdown, no code fences). Use this exact JSON structure:
{
  "status": "VERIFIED" | "SUSPICIOUS" | "UNVERIFIED" | "INSUFFICIENT_DATA",
  "confidence": <number 0-100>,
  "medicineName": "<name>",
  "activeIngredients": ["<ingredient1>"],
  "manufacturer": { "name": "<name>", "verified": <boolean>, "country": "<country>" },
  "warnings": ["<warning1>"],
  "sideEffects": ["<effect1>"],
  "interactions": ["<interaction1>"],
  "dosageInfo": "<dosage>",
  "storageConditions": "<storage>",
  "summary": "<summary paragraph>"
}`;

const IMAGE_SYSTEM_PROMPT = `You are MedVerify, a pharmaceutical verification AI assistant. Analyze the medicine image. Look at packaging, labels, text, colors, logos, barcodes, and any visible details. Provide a comprehensive verification report. You must respond ONLY with valid JSON (no markdown, no code fences). Use this exact JSON structure:
{
  "status": "VERIFIED" | "SUSPICIOUS" | "UNVERIFIED" | "INSUFFICIENT_DATA",
  "confidence": <number 0-100>,
  "medicineName": "<name>",
  "activeIngredients": ["<ingredient1>"],
  "manufacturer": { "name": "<name>", "verified": <boolean>, "country": "<country>" },
  "warnings": ["<warning1>"],
  "sideEffects": ["<effect1>"],
  "interactions": ["<interaction1>"],
  "dosageInfo": "<dosage>",
  "storageConditions": "<storage>",
  "summary": "<summary paragraph>"
}`;

const CHAT_SYSTEM_PROMPT = `You are MedVerify Health Assistant, a knowledgeable and caring medical information AI. You help users with:
1. Understanding symptoms and when to seek medical attention
2. General information about medicines prescribed by doctors
3. Drug interactions and side effects
4. Dosage guidelines and administration methods
5. Storage and handling of medicines
6. General health and wellness advice

IMPORTANT GUIDELINES:
- Always recommend consulting a healthcare professional for specific medical advice
- Never diagnose conditions - only provide general information
- Be empathetic and supportive in your responses
- Use clear, simple language that patients can understand
- When discussing medicines, always mention common side effects and interactions
- Include appropriate disclaimers about seeking professional medical advice
- Format your responses clearly with sections when appropriate
- You can use **bold** for emphasis and bullet points for lists`;

// ─── Helper: parse JSON from Groq response ─────────────────────────────────────

function parseGroqJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from the response using regex
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Failed to parse JSON from Groq response');
      }
    }
    throw new Error('No JSON found in Groq response');
  }
}

// ─── POST /api/verify/text ──────────────────────────────────────────────────────

app.post('/api/verify/text', async (req, res) => {
  try {
    const { medicineName, manufacturer, batchNumber, expiryDate, additionalInfo } = req.body;

    if (!medicineName) {
      return res.status(400).json({ success: false, error: 'Medicine name is required' });
    }

    const userMessage = `Please verify the following medicine:
- Medicine Name: ${medicineName || 'Not provided'}
- Manufacturer: ${manufacturer || 'Not provided'}
- Batch Number: ${batchNumber || 'Not provided'}
- Expiry Date: ${expiryDate || 'Not provided'}
- Additional Information: ${additionalInfo || 'None'}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: VERIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2048,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || '';
    const parsedResult = parseGroqJSON(responseText);

    return res.json({ success: true, data: parsedResult });
  } catch (error) {
    console.error('Text verification error:', error.message);
    return res.status(500).json({
      success: false,
      error: `Verification failed: ${error.message}`,
    });
  }
});

// ─── POST /api/verify/image ─────────────────────────────────────────────────────

app.post('/api/verify/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    let responseText = '';

    // Try vision model first (meta-llama/llama-4-scout-17b-16e-instruct)
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: IMAGE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
              {
                type: 'text',
                text: 'Please analyze this medicine image and provide a verification report.',
              },
            ],
          },
        ],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        temperature: 0.3,
        max_tokens: 2048,
      });

      responseText = chatCompletion.choices[0]?.message?.content || '';
    } catch (visionError) {
      console.warn('Vision model failed, falling back to text model:', visionError.message);

      // Fallback to text-only analysis
      const fallbackCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: VERIFICATION_SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              'An image of a medicine was uploaded but visual analysis is unavailable. Please provide a general response about medicine verification. Respond with the standard JSON format, using status "INSUFFICIENT_DATA" and explain in the summary that visual analysis could not be performed.',
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 2048,
      });

      responseText = fallbackCompletion.choices[0]?.message?.content || '';
    }

    const parsedResult = parseGroqJSON(responseText);
    return res.json({ success: true, data: parsedResult });
  } catch (error) {
    console.error('Image verification error:', error.message);
    return res.status(500).json({
      success: false,
      error: `Image verification failed: ${error.message}`,
    });
  }
});

// ─── POST /api/chat ─────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages array is required' });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...messages,
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
      stream: false,
    });

    const assistantMessage = chatCompletion.choices[0]?.message?.content || '';

    return res.json({ success: true, message: assistantMessage });
  } catch (error) {
    console.error('Chat error:', error.message);
    return res.status(500).json({
      success: false,
      error: `Chat failed: ${error.message}`,
    });
  }
});

// ─── POST /api/interactions ──────────────────────────────────────────────────────

app.post('/api/interactions', async (req, res) => {
  try {
    const { medicines } = req.body;

    if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 medicines are required to check interactions',
      });
    }

    const systemPrompt = `You are MedVerify Drug Interaction Analyzer. Analyze potential interactions between the provided list of medicines. You must respond ONLY with valid JSON (no markdown, no code fences). Use this exact structure:
{
  "riskLevel": "HIGH" | "MODERATE" | "LOW" | "NONE",
  "interactions": [
    {
      "drug1": "<name>",
      "drug2": "<name>",
      "severity": "HIGH" | "MODERATE" | "LOW",
      "type": "<interaction type>",
      "description": "<detailed description>",
      "recommendation": "<what to do>"
    }
  ],
  "safeCombinatons": ["<drug1> + <drug2>"],
  "generalAdvice": "<overall advice paragraph>",
  "summary": "<brief summary>"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Check interactions between these medicines: ${medicines.join(', ')}` },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2048,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || '';
    const parsedResult = parseGroqJSON(responseText);

    return res.json({ success: true, data: parsedResult });
  } catch (error) {
    console.error('Interaction check error:', error.message);
    return res.status(500).json({
      success: false,
      error: `Interaction check failed: ${error.message}`,
    });
  }
});

// ─── POST /api/prescription/read ────────────────────────────────────────────────

app.post('/api/prescription/read', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const systemPrompt = `You are MedVerify Prescription Reader. Analyze the prescription image and extract all medicine information. You must respond ONLY with valid JSON (no markdown, no code fences). Use this exact structure:
{
  "medicines": [
    {
      "name": "<medicine name>",
      "dosage": "<dosage e.g. 500mg>",
      "frequency": "<e.g. twice daily>",
      "duration": "<e.g. 7 days>",
      "instructions": "<e.g. take after meals>"
    }
  ],
  "doctorName": "<if visible>",
  "patientName": "<if visible>",
  "date": "<if visible>",
  "diagnosis": "<if visible>",
  "additionalNotes": "<any other notes>",
  "confidence": <0-100>,
  "summary": "<brief summary of the prescription>"
}`;

    let responseText = '';

    // Try vision model first
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
              {
                type: 'text',
                text: 'Please read this prescription image and extract all medicine information.',
              },
            ],
          },
        ],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        temperature: 0.3,
        max_tokens: 2048,
      });

      responseText = chatCompletion.choices[0]?.message?.content || '';
    } catch (visionError) {
      console.warn('Vision model failed for prescription, falling back to text model:', visionError.message);

      // Fallback to text-only analysis
      const fallbackCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content:
              'A prescription image was uploaded but visual analysis is unavailable. Please respond with the standard JSON format with empty medicines array and explain in summary that the image could not be analyzed.',
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 2048,
      });

      responseText = fallbackCompletion.choices[0]?.message?.content || '';
    }

    const parsedResult = parseGroqJSON(responseText);
    return res.json({ success: true, data: parsedResult });
  } catch (error) {
    console.error('Prescription read error:', error.message);
    return res.status(500).json({
      success: false,
      error: `Prescription read failed: ${error.message}`,
    });
  }
});

// ─── GET /api/health ────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    groqConnected: !!process.env.GROQ_API_KEY,
  });
});

// ─── Static file serving (production) ───────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});




}

// ─── Start server ───────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 MedVerify server running at http://localhost:${PORT}`);
  console.log(`📋 API endpoints:`);
  console.log(`   POST /api/verify/text        - Text-based medicine verification`);
  console.log(`   POST /api/verify/image       - Image-based medicine verification`);
  console.log(`   POST /api/chat               - Health assistant chat`);
  console.log(`   POST /api/interactions        - Drug interaction checker`);
  console.log(`   POST /api/prescription/read   - Prescription image reader`);
  console.log(`   GET  /api/health              - Health check`);
});
