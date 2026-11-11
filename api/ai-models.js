/**
 * Debug endpoint — lists available Gemini models for this API key.
 * GET /api/ai-models
 * Remove or secure this after debugging.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const geminiKey = process.env.GEMINI_API_KEY || "";
  if (!geminiKey) return res.status(200).json({ error: "GEMINI_API_KEY not set" });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey.trim()}`,
      { headers: { "Content-Type": "application/json" } }
    );
    const data = await r.json();
    const generateContentModels = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map(m => ({ name: m.name, displayName: m.displayName, description: (m.description || "").slice(0, 80) }));

    return res.status(200).json({
      total: generateContentModels.length,
      models: generateContentModels,
    });
  } catch (e) {
    return res.status(200).json({ error: e?.message || String(e) });
  }
}
