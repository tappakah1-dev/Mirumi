module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [
        {
          parts: [
            {
              text: 'Write 1 short viral meme top text and bottom text for $MIRUMI, Tokyo\'s viral plush robot charm on Solana. Return strictly JSON in form: {"topText": "...", "bottomText": "..."}',
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            topText: { type: "STRING" },
            bottomText: { type: "STRING" },
          },
          required: ["topText", "bottomText"],
        },
      },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    const jsonStr = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonStr) {
      return res.status(502).json({ error: "No caption returned by Gemini" });
    }
    res.status(200).json(JSON.parse(jsonStr));
  } catch (err) {
    console.error("Caption gen error:", err);
    res.status(500).json({ error: "Caption generation failed" });
  }
};
