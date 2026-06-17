export async function generateSceneImage(imagePrompt) {
  try {
    const apiKey = import.meta.env.VITE_TOGETHER_KEY;

    const enhancedPrompt = `cinematic cooking video scene, professional food photography, high quality, sharp focus, ${imagePrompt}`;

    const response = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "black-forest-labs/FLUX.1-schnell-Free",
        prompt: enhancedPrompt,
        width: 1280,
        height: 720,
        steps: 4,
        n: 1,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Together API error:", err);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) return null;

    return imageUrl;
  } catch (error) {
    console.error("Image generation error:", error);
    return null;
  }
}