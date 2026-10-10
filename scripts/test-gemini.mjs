// Quick check: npm run test-gemini
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
if (!key) { console.error('❌ GEMINI_API_KEY is empty. Open the .env file and paste your key.'); process.exit(1); }
const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
try {
  const ai = new GoogleGenAI({ apiKey: key });
  const r = await ai.models.generateContent({ model, contents: 'Reply with one short friendly line: "NOVA is ready".' });
  console.log('✅ Gemini works (' + model + '):', r.text);
} catch (e) {
  console.error('❌ Gemini call failed:', e.message);
  process.exit(1);
}
