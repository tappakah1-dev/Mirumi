const CHARACTER_ANCHOR =
  "CHARACTER MANDATE (CRITICAL): The central subject MUST strictly be the character MIRUMI - a real viral fluffy plush toy. Visual features that MUST be preserved exactly: 1) A round, pom-pom-shaped body made entirely of extremely soft, dense, fluffy fur with no visible seams, 2) Large round googly eyes - black pupils on a white/cream base, slightly offset like stuck-on craft eyes, 3) A tiny black button nose, no visible mouth, 4) No robot parts, no screen face, no antenna, no digital/glowing elements of any kind - MIRUMI is a plush fur creature, not a robot, 5) Short stubby fuzzy arms and legs barely poking out from the round fur body, 6) Comes in soft pastel fur colors such as blush pink, dove grey, or cream/ivory. Always keep MIRUMI as the single main hero character, exactly like a real plush toy photographed in a cute lifestyle setting. Do NOT invent robots, screens, antennas, different characters, humans, or unrelated mascots.";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    const promptInput =
      (req.body?.prompt || "").trim() ||
      "holding a glowing Solana coin on a rocket ship blasting to the moon, crypto trading charts in the background";

    const userPrompt = `${CHARACTER_ANCHOR} Scene & Action: ${promptInput}. Include crypto/memecoin visual elements (Solana logo colors, coins, candlestick charts, "to the moon" energy, or a phone/laptop showing a green trading chart) worked naturally into the scene. High quality photo-real product shot, soft studio lighting, shallow depth of field, shot like a real plush toy lifestyle photo.`;

    // Try Imagen first
    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`;
    let r = await fetch(imagenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: userPrompt }],
        parameters: { sampleCount: 1 },
      }),
    });
    let data = await r.json();
    let base64Data = data?.predictions?.[0]?.bytesBase64Encoded;

    // Fallback to gemini image-preview model
    if (!base64Data) {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`;
      r = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      });
      data = await r.json();
      const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      base64Data = part?.inlineData?.data;
    }

    if (!base64Data) {
      return res.status(502).json({ error: "No image returned by Gemini/Imagen" });
    }
    res.status(200).json({ base64: base64Data });
  } catch (err) {
    console.error("Image gen error:", err);
    res.status(500).json({ error: "Image generation failed" });
  }
};
