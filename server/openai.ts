import OpenAI from "openai";

// Initialize OpenAI client with AI Gateway or direct OpenAI
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
});

export async function generateImageBuffer(prompt: string, size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024"): Promise<Buffer> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    });

    const base64 = response.data[0]?.b64_json;
    if (!base64) {
      throw new Error("No image data received");
    }

    return Buffer.from(base64, "base64");
  } catch (error) {
    console.error("Error generating image:", error);
    // Return a placeholder buffer or throw
    throw error;
  }
}
