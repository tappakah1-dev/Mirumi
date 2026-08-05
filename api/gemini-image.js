const CHARACTER_ANCHOR =
  "CHARACTER MANDATE (CRITICAL): The central subject MUST strictly be the character MIRUMI - a real viral fluffy plush toy. Visual features that MUST be preserved exactly: 1) BODY SHAPE IS THE #1 PRIORITY: a perfect circle / sphere when viewed from the front, like a beach ball or pom-pom - the width of the body and the height of the body must be EQUAL. This is NOT an egg, NOT a teardrop, NOT taller-than-wide, NOT narrower at the top and wider at the bottom. If you imagine a circle drawn around the body, the body should touch that circle on all sides evenly, 2) Made entirely of extremely soft, dense, fluffy fur with no visible seams, 3) Large round googly eyes - black pupils on a white/cream base, slightly offset like stuck-on craft eyes, positioned in the upper-middle of the round body, 4) A tiny black button nose, no visible mouth, 5) No robot parts, no screen face, no antenna, no digital/glowing elements of any kind - MIRUMI is a plush fur creature, not a robot, 6) Very short stubby fuzzy arms and legs that stay tucked close to the round silhouette and do not change its circular outline, 7) Comes in soft pastel fur colors such as blush pink, dove grey, or cream/ivory. Always keep MIRUMI as a single main hero character shaped like a round fluffy ball, exactly like a real plush toy photographed in a cute lifestyle setting. Do NOT invent robots, screens, antennas, different characters, humans, or unrelated mascots. REJECT any composition where the body reads as oval, egg-shaped, or elongated - re-draw it as a circle/sphere instead.";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    const promptInput =
      (req.body?.prompt || "").trim() ||
      "celebrating a huge Solana pump, crazy gains vibe";

    const userPrompt = `${CHARACTER_ANCHOR} Scene & Action: ${promptInput}.

STYLE - "Solana degen" vibe: photo-real lifestyle shot, warm cozy lighting, shallow depth of field. Weave in crypto/degen cues where they fit naturally - things like a chart pumping green, Solana coins, a handwritten degen sign (slang like "TO THE MOON", "WAGMI", "ATH", "DIAMOND HANDS"), confetti, a toy rocket. You choose which cues and how to compose the scene - keep it feeling like a real, slightly chaotic "crypto degen just won big" moment, cute because MIRUMI is a soft round plush.

Do not add any text overlays yourself beyond what's written on in-scene props/signs - the meme caption text is added separately afterward.`;

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
