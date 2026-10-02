import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Enable JSON body parsing
app.use(express.json());

// Initialize GoogleGenAI client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Gemini Multi-Turn Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model, systemInstruction, financialContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Default to gemini-3.5-flash as requested
    const selectedModel = model || 'gemini-3.5-flash';

    // Build system instruction
    const baseSystemInstruction = systemInstruction || 
      'Anda adalah Asisten Penasihat Keuangan Cerdas GamMenkeu (AI Financial Advisor). Anda membantu pengguna merencanakan arus kas, menganalisis pengeluaran berdasarkan aturan 50/30/20, memberikan rekomendasi investasi, penghematan, serta tips finansial praktis. Jawab dengan ramah, profesional, ringkas, dan jelas dalam Bahasa Indonesia.';

    const fullSystemInstruction = financialContext 
      ? `${baseSystemInstruction}\n\n[KONTEKS FINANSIAL SAAT INI]:\n${financialContext}`
      : baseSystemInstruction;

    // Convert messages to GenAI contents format
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: contents,
      config: {
        systemInstruction: fullSystemInstruction,
      }
    });

    const reply = response.text || 'Maaf, saya tidak dapat menghasilkan respon saat ini.';
    return res.json({ reply, model: selectedModel });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Terjadi kesalahan saat berkomunikasi dengan Gemini API.' 
    });
  }
});

// Serve static files from current directory
app.use(express.static(__dirname));

// Send index.html for any remaining route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
