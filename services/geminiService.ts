import { GoogleGenAI, Type } from "@google/genai"

const model = "gemini-2.5-flash"
const BATCH_SIZE = 50

/**
 * Adds a delay between operations.
 * @param ms The number of milliseconds to wait.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getDetailInstruction = (detailLevel: string): string => {
  switch (detailLevel) {
    case "Short":
      return "The prompts should be short, concise, and punchy (3-7 words)."
    case "Detailed":
      return "The prompts should be highly detailed and descriptive, suggesting elements like mood, lighting, composition, and potential camera settings (20-30 words)."
    case "Medium":
    default:
      return "The prompts should be a standard length, descriptive, and actionable for a photographer (8-15 words)."
  }
}

const getImageTypeInstruction = (imageType: string): string => {
  switch (imageType) {
    case "vector":
      return "Generate prompts for vector graphics, logos, icons, and illustrations. Focus on clean lines, minimalist designs, geometric shapes, and scalable artwork."
    case "photography":
    default:
      return "Generate prompts for stock photography images."
  }
}

const getHumanPresenceInstruction = (humanPresence: string): string => {
  switch (humanPresence) {
    case "Include":
      return "The prompts must explicitly include people or describe scenes with clear human presence."
    case "Exclude":
      return "The prompts must not include any people or direct signs of human presence. Focus on nature, objects, abstracts, or wildlife."
    case "Any":
    default:
      return ""
  }
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    prompts: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: "A single, concise stock photography prompt.",
      },
    },
  },
  required: ["prompts"],
}

const titleResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A creative, concise title for the image prompt (3-7 words).",
    },
  },
  required: ["title"],
}

const getApiKey = (): string => {
  if (typeof window !== "undefined") {
    const apiKey = localStorage.getItem("gemini_api_key")
    if (!apiKey) {
      throw new Error("Gemini API key not set. Please configure it in API Settings on the main menu.")
    }
    return apiKey
  }
  // Fallback to environment variable for server-side rendering
  const envKey = process.env.API_KEY
  if (!envKey) {
    throw new Error("API_KEY environment variable is not set.")
  }
  return envKey
}

const generate = async (prompt: string): Promise<string[]> => {
  try {
    const apiKey = getApiKey()
    const ai = new GoogleGenAI({ apiKey })

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 1,
      },
    })

    const jsonText = response.text.trim()
    const parsed = JSON.parse(jsonText)

    if (parsed && Array.isArray(parsed.prompts)) {
      return parsed.prompts
    } else {
      throw new Error("Invalid response format from API. Expected an object with a 'prompts' array.")
    }
  } catch (error) {
    console.error("Gemini API Error:", error)
    throw new Error("Failed to generate prompts. Please check your API key and network connection.")
  }
}

const generateTitle = async (prompt: string): Promise<string> => {
  try {
    const apiKey = getApiKey()
    const ai = new GoogleGenAI({ apiKey })

    const response = await ai.models.generateContent({
      model: model,
      contents: `Generate a creative and concise title (3-7 words) for this image prompt: "${prompt}". The title should be memorable and capture the essence of the image.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: titleResponseSchema,
        temperature: 0.8,
      },
    })

    const jsonText = response.text?.trim()
    if (!jsonText) {
      throw new Error("Empty response from API")
    }

    const parsed = JSON.parse(jsonText)

    if (parsed && parsed.title) {
      return parsed.title
    } else {
      throw new Error("Invalid response format from API. Expected an object with a 'title' field.")
    }
  } catch (error) {
    console.error("Gemini Title Generation Error:", error)
    // Return a fallback title based on the prompt
    return prompt.substring(0, 50) || "Untitled Image"
  }
}

const parseInput = (input: string): { type: "category" | "keywords" | "letters"; parsed: string } => {
  const trimmed = input.trim()

  // Check if it's just letters (single characters separated by spaces or commas)
  const letterPattern = /^[a-zA-Z](\s*,?\s*[a-zA-Z])*$/
  if (letterPattern.test(trimmed)) {
    return { type: "letters", parsed: trimmed }
  }

  // Check if it contains multiple short words (likely keywords)
  const words = trimmed.split(/[\s,]+/).filter((w) => w.length > 0)
  if (words.length > 3 && words.every((w) => w.length < 15)) {
    return { type: "keywords", parsed: words.join(", ") }
  }

  // Otherwise treat as category
  return { type: "category", parsed: trimmed }
}

const buildPromptForInput = (input: string, count: number, detailLevel: string, humanPresence: string, imageType: string = "photography"): string => {
  const { type, parsed } = parseInput(input)
  const detailInstruction = getDetailInstruction(detailLevel)
  const humanInstruction = getHumanPresenceInstruction(humanPresence)
  const imageTypeInstruction = getImageTypeInstruction(imageType)

  switch (type) {
    case "letters":
      return `Generate ${count} unique prompts for ${imageType === "vector" ? "vector graphics, logos, and icons" : "stock photography"}. ${imageTypeInstruction} Each prompt should start with or prominently feature words beginning with these letters: ${parsed}. ${detailInstruction} ${humanInstruction} Be creative and diverse in your interpretations.`

    case "keywords":
      return `Generate ${count} unique prompts for ${imageType === "vector" ? "vector graphics, logos, and icons" : "stock photography"}. ${imageTypeInstruction} The prompts should incorporate or relate to these keywords: ${parsed}. ${detailInstruction} ${humanInstruction} The prompts should naturally blend these concepts in creative ways.`

    case "category":
    default:
      return `Generate ${count} unique and high-quality prompts for ${imageType === "vector" ? "vector graphics, logos, and icons" : "stock photography"} in the specific category: "${parsed}". ${imageTypeInstruction} ${detailInstruction} ${humanInstruction} The prompts should be creative and actionable.`
  }
}

export const generateBulkPrompts = async (
  count: number,
  detailLevel: string,
  humanPresence: string,
  onProgress: (prompts: string[]) => void,
  imageType: string = "photography",
): Promise<void> => {
  let remaining = count
  while (remaining > 0) {
    const batchCount = Math.min(remaining, BATCH_SIZE)
    const detailInstruction = getDetailInstruction(detailLevel)
    const humanInstruction = getHumanPresenceInstruction(humanPresence)
    const imageTypeInstruction = getImageTypeInstruction(imageType)
    const prompt = `Generate ${batchCount} unique, high-quality, and diverse prompts for ${imageType === "vector" ? "vector graphics, logos, icons, and illustrations" : "stock photography"}. ${imageTypeInstruction} ${detailInstruction} ${humanInstruction} Cover a wide range of subjects.`
    const newPrompts = await generate(prompt)
    onProgress(newPrompts)
    remaining -= batchCount

    if (remaining > 0) {
      await delay(1000) // Add delay to prevent rate-limiting
    }
  }
}

export const generateSingleCategoryPrompts = async (
  category: string,
  count: number,
  detailLevel: string,
  humanPresence: string,
  onProgress: (prompts: string[]) => void,
  imageType: string = "photography",
): Promise<void> => {
  let remaining = count
  while (remaining > 0) {
    const batchCount = Math.min(remaining, BATCH_SIZE)
    const prompt = buildPromptForInput(category, batchCount, detailLevel, humanPresence, imageType)
    const newPrompts = await generate(prompt)
    onProgress(newPrompts)
    remaining -= batchCount

    if (remaining > 0) {
      await delay(1000)
    }
  }
}

export const generateMultiCategoryPrompts = async (
  categories: string[],
  countPerCategory: number,
  detailLevel: string,
  humanPresence: string,
  onProgress: (prompts: string[]) => void,
  imageType: string = "photography",
): Promise<void> => {
  const validCategories = categories.filter((c) => c.trim() !== "")
  for (const [index, category] of validCategories.entries()) {
    await generateSingleCategoryPrompts(category, countPerCategory, detailLevel, humanPresence, onProgress, imageType)

    if (index < validCategories.length - 1) {
      await delay(1000)
    }
  }
}

export { generateTitle }
