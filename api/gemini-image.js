const CHARACTER_ANCHOR =
  "CHARACTER MANDATE (CRITICAL): The central subject MUST strictly be the character MIRUMI - a real viral fluffy plush toy. Visual features that MUST be preserved exactly: 1) BODY SHAPE IS THE #1 PRIORITY: a perfect circle / sphere when viewed from the front, like a beach ball or pom-pom - the width of the body and the height of the body must be EQUAL. This is NOT an egg, NOT a teardrop, NOT taller-than-wide, NOT narrower at the top and wider at the bottom. If you imagine a circle drawn around the body, the body should touch that circle on all sides evenly, 2) Made entirely of extremely soft, dense, fluffy fur with no visible seams (or the fur texture reinterpreted appropriately for the chosen art style below), 3) Large round googly eyes - black pupils on a white/cream base, slightly offset like stuck-on craft eyes, positioned in the upper-middle of the round body, 4) A tiny black button nose, no visible mouth, 5) No robot parts, no screen face, no antenna, no digital/glowing elements of any kind - MIRUMI is a plush fur creature, not a robot, 6) Very short stubby fuzzy arms and legs that stay tucked close to the round silhouette and do not change its circular outline, 7) Comes in soft pastel fur colors such as blush pink, dove grey, or cream/ivory. Always keep MIRUMI as a single main hero character shaped like a round fluffy ball. Do NOT invent robots, screens, antennas, different characters, humans, or unrelated mascots. REJECT any composition where the body reads as oval, egg-shaped, or elongated - re-draw it as a circle/sphere instead.";

const STYLE_MAP = {
  realistic:
    'RENDER STYLE: photo-real lifestyle shot, like a real plush toy photographed with a camera - natural lighting, shallow depth of field, real textures and materials.',
  cartoon:
    'RENDER STYLE: flat 2D cartoon/vector illustration - bold clean outlines, flat bright colors, simple cel-shading, like a modern animated show or sticker pack.',
  '3d':
    'RENDER STYLE: 3D animated movie render, Pixar/DreamWorks style - soft global illumination, subsurface scattering on the fur, polished CGI look, cinematic render.',
  sketch:
    'RENDER STYLE: hand-drawn illustration - visible pencil or ink linework, cross-hatching or colored-pencil shading, textured paper background, like a sketchbook drawing or storybook illustration.',
  anime:
    'RENDER STYLE: Japanese anime/manga illustration style - clean cel-shaded coloring, expressive linework, anime-style background rendering.',
  clay:
    'RENDER STYLE: claymation / stop-motion style - visible clay/plasticine texture with fingerprint-like imperfections, miniature set-like background, like a Aardman-style stop-motion film frame.',
  pixel:
    'RENDER STYLE: retro pixel art, 16-bit video game style - visible pixel grid, limited color palette, crisp blocky shading, like a classic SNES/Genesis game sprite scene.',
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    const promptInput = (req.body?.prompt || "").trim();
    const styleKey = STYLE_MAP[req.body?.style] ? req.body.style : "realistic";
    const styleLine = STYLE_MAP[styleKey];

    const sceneLine = promptInput
      ? `Scene & Action: ${promptInput}. Interpret this literally and visually - actually depict the concepts, objects, and actions mentioned (e.g. if it mentions the moon, put MIRUMI on/near an actual moon in the scene; if it mentions diamond hands, show MIRUMI holding or surrounded by diamonds/gems; if it mentions a rocket, put a rocket in the scene). Don't just restate the words as text on a sign - build the actual scene around what's described.`
      : `Scene & Action: invent something yourself - a completely unexpected, wildly creative moment of MIRUMI celebrating a huge Solana pump.`;

    const userPrompt = `${CHARACTER_ANCHOR} ${sceneLine}

${styleLine}

MOOD - "Solana degen" vibe: whatever the render style, keep the overall mood a chaotic, hype "crypto degen just won big" moment. Invent a fresh, unexpected location and composition every single time - never default to a desk/office/trading setup unless it's specifically requested. Draw from any genre: outdoors, underwater, space, historical, futuristic, surreal/absurd, fantasy, nature, urban, anything - be genuinely imaginative and varied, not formulaic. Weave in crypto/degen cues where they fit naturally - things like a chart pumping green, Solana coins, a handwritten degen sign (slang like "TO THE MOON", "WAGMI", "ATH", "DIAMOND HANDS"), confetti, a toy rocket - but only where they make sense for the setting, don't force all of them in.

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
          generationConfig: { responseModalities: ["IMAGE"], temperature: 1.4 },
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
