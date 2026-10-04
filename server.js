import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Enable JSON body parsing
app.use(express.json());

// Helper to get GoogleGenAI client with fresh API key and User-Agent
function getApiKey() {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey !== 'MY_GEMINI_API_KEY') {
    return envKey;
  }
  try {
    if (fs.existsSync('.env')) {
      const content = fs.readFileSync('.env', 'utf8');
      const match = content.match(/GEMINI_API_KEY=([^\s\r\n]+)/);
      if (match && match[1] && match[1] !== 'MY_GEMINI_API_KEY') {
        return match[1];
      }
    }
  } catch(e) {}
  return envKey;
}

function getGenAI() {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Fallback Financial Advisory Intelligence
function generateFallbackFinancialAdvice(lastUserMessage, financialContext) {
  const msg = (lastUserMessage || '').toLowerCase();
  
  if (msg.includes('pangkas') || msg.includes('tips') || msg.includes('hemat') || msg.includes('kurangi') || msg.includes('pengeluaran')) {
    return `Berikut 3 tips praktis memangkas pengeluaran tanpa mengurangi kualitas hidup:\n\n` +
      `1. **Audit Langganan Digital & Utilitas (Audit Subscription)**:\n` +
      `   Cek tagihan streaming, keanggotaan gym, atau paket data yang jarang digunakan. Mengubah ke paket keluarga (family plan) atau beralih ke provider yang lebih hemat bisa memangkas 15–30% tagihan rutin tanpa kehilangan hiburan.\n\n` +
      `2. **Terapkan Aturan 48 Jam untuk Keinginan (Delayed Gratification)**:\n` +
      `   Saat ingin belanja barang non-esensial (pakaian, gadget, nongkrong impulsif), tunda pembelian selama 48 jam. Jika setelah 2 hari Anda masih merasa membutuhkannya, barulah beli. Kebanyakan dorongan belanja impulsif akan mereda dengan sendirinya.\n\n` +
      `3. **Ganti Kebiasaan Tanpa Mengorbankan Suasana (Smart Substitution)**:\n` +
      `   Alih-alih nongkrong setiap hari di cafe mahal, jadwalkan seduh kopi berkualitas sendiri di hari kerja, lalu simpan nongkrong di cafe sebagai reward akhir pekan bersama teman atau pasangan (ngedate). Anda tetap menikmati gaya hidup tanpa menguras dompet.`;
  }

  if (msg.includes('50/30/20') || msg.includes('anggaran') || msg.includes('alokasi') || msg.includes('rasio')) {
    return `Evaluasi aturan alokasi anggaran 50/30/20 untuk stabilitas keuangan Anda:\n\n` +
      `• **50% Kebutuhan Pokok (Needs)**: Makanan, tempat tinggal, transportasi harian, dan tagihan listrik/air.\n` +
      `• **30% Keinginan (Wants)**: Nongkrong bareng teman, ngedate bersama pasangan, hobi, dan liburan.\n` +
      `• **20% Tabungan & Investasi (Savings/Debt)**: Dana darurat 3-6 bulan pengeluaran, reksadana, dan pembayaran utang produktif.\n\n` +
      `*Tips*: Jika pos Keinginan (nongkrong/ngedate) Anda melebihi 30%, gunakan fitur Ambang Batas Anggaran di GamMenkeu untuk menetapkan limit per kategori secara mandiri.`;
  }

  if (msg.includes('investasi') || msg.includes('portofolio') || msg.includes('saham') || msg.includes('reksadana')) {
    return `Panduan diversifikasi portofolio investasi berdasarkan profil risiko:\n\n` +
      `1. **Konservatif**: 70% Pasar Uang / Deposito, 25% Surat Berharga Negara (SBN/Sukuk), 5% Emas.\n` +
      `2. **Moderat**: 40% Obligasi/Pendapatan Tetap, 30% Reksadana Saham / Indeks, 20% Pasar Uang, 10% Emas.\n` +
      `3. **Agresif**: 60% Saham / Equity Fund, 20% Obligasi, 10% Aset Kripto/P2P, 10% Dana Kas.\n\n` +
      `Pastikan dana darurat Anda telah terisi minimal 3 bulan sebelum memperbesar alokasi pada aset berisiko tinggi.`;
  }

  return `Halo! Sebagai Asisten Finansial GamMenkeu, saya siap membantu mengoptimalkan keuangan Anda.\n\n` +
    `Anda dapat bertanya seputar:\n` +
    `• Analisis arus kas dan pos pengeluaran terbesar bulan ini.\n` +
    `• Evaluasi penerapan rumus alokasi 50/30/20.\n` +
    `• Rekomendasi pengelolaan pos nongkrong, ngedate, dan belanja pribadi.\n` +
    `• Strategi diversifikasi portofolio dan pembentukan dana darurat.`;
}

// Gemini Multi-Turn Chat Endpoint
app.post('/api/chat', async (req, res) => {
  const { messages, model, systemInstruction, financialContext } = req.body || {};
  let selectedModel = 'gemini-3.1-flash-lite';

  try {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Model normalization according to @google/genai guidelines
    if (model === 'gemini-3.8-flash') {
      selectedModel = 'gemini-3.8-flash';
    } else if (model === 'gemini-2.5-pro' || model === 'gemini-3.1-pro-preview') {
      selectedModel = 'gemini-2.5-pro';
    } else {
      selectedModel = 'gemini-3.1-flash-lite';
    }

    // Build system instruction
    const baseSystemInstruction = systemInstruction || 
      'Anda adalah Asisten Penasihat Keuangan Cerdas GamMenkeu (AI Financial Advisor). Anda membantu pengguna merencanakan arus kas, menganalisis pengeluaran berdasarkan aturan 50/30/20, memberikan rekomendasi investasi, penghematan, serta tips finansial praktis. Jawab dengan ramah, profesional, ringkas, dan jelas dalam Bahasa Indonesia.';

    const fullSystemInstruction = financialContext 
      ? `${baseSystemInstruction}\n\n[KONTEKS FINANSIAL SAAT INI]:\n${financialContext}`
      : baseSystemInstruction;

    const ai = getGenAI();
    if (!ai) {
      const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')?.content || '';
      const fallbackAdvice = generateFallbackFinancialAdvice(lastUserMessage, financialContext);
      return res.json({
        reply: fallbackAdvice,
        model: 'GamMenkeu Advisor AI',
        isFallback: true
      });
    }

    // Convert messages to GenAI contents format
    const contents = messages.map(m => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Candidate models order: primary requested, then robust fallback
    const candidateModels = [selectedModel];
    if (selectedModel !== 'gemini-3.1-flash-lite') candidateModels.push('gemini-3.1-flash-lite');
    if (selectedModel !== 'gemini-3.8-flash') candidateModels.push('gemini-3.8-flash');

    let reply = null;
    let successfulModel = selectedModel;
    let lastError = null;

    for (const mod of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: mod,
          contents: contents,
          config: {
            systemInstruction: fullSystemInstruction,
          }
        });
        if (response && response.text) {
          reply = response.text;
          successfulModel = mod;
          break;
        }
      } catch (modErr) {
        lastError = modErr;
        console.warn(`Model ${mod} failed with: ${modErr.message}. Trying next candidate if available.`);
      }
    }

    if (reply) {
      return res.json({ reply, model: successfulModel });
    }

    // If all online models hit temporary demand spikes, serve intelligent financial advisor advice
    const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')?.content || '';
    const fallbackAdvice = generateFallbackFinancialAdvice(lastUserMessage, financialContext);
    if (fallbackAdvice) {
      return res.json({ reply: fallbackAdvice, model: 'GamMenkeu Advisor AI', isFallback: true });
    }

    throw lastError || new Error('Tidak dapat terhubung ke model AI saat ini.');
  } catch (error) {
    console.error('Gemini API Error:', error);
    try {
      const lastUserMessage = (messages && Array.isArray(messages)) 
        ? (messages.slice().reverse().find(m => m.role === 'user')?.content || '')
        : '';
      const fallbackAdvice = generateFallbackFinancialAdvice(lastUserMessage, financialContext);
      if (fallbackAdvice) {
        return res.json({ reply: fallbackAdvice, model: 'GamMenkeu Advisor AI', isFallback: true });
      }
    } catch(fallbackErr) {
      console.error('Fallback generation error:', fallbackErr);
    }

    let errMsg = error.message || 'Terjadi kendala teknis saat menghubungi Gemini API.';
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed && parsed.error && parsed.error.message) {
        errMsg = parsed.error.message;
      }
    } catch(e) {}

    return res.status(500).json({ 
      error: errMsg 
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
