import { urbKnowledge } from './knowledge.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
        systemInstruction: { 
          parts: [{ text: urbKnowledge }] 
        },
        generationConfig: { temperature: 0.3 }
      })
    });

    const data = await geminiResponse.json();
    const reply = data.candidates[0].content.parts[0].text;

    res.status(200).json({ reply });
    
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
}
