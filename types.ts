export interface Prompt {
  id: number
  prompt: string
}

export enum GenerationMode {
  BULK = "BULK",
  SINGLE_CATEGORY = "SINGLE_CATEGORY",
  MULTI_CATEGORY = "MULTI_CATEGORY",
}

export interface GeneratedImage {
  id: string
  prompt: string
  imageUrl: string
  seed: string
  timestamp: number
  status: "pending" | "generating" | "completed" | "error"
  error?: string
  title?: string
}

export interface WhiskGenerationConfig {
  prompts: string[]
  delayBetweenRequests: number
  batchSize: number
  bearerToken: string
}
