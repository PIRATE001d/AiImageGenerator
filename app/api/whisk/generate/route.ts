import { type NextRequest, NextResponse } from "next/server"
import { generateTitle } from "@/services/geminiService"

const API_ENDPOINT = "https://aisandbox-pa.googleapis.com/v1/whisk:generateImage"

interface WhiskPayload {
  client_context: {
    workflow_id: string
    tool: string
    session_id: string
  }
  image_model_settings: {
    image_model: string
    aspect_ratio: string
  }
  media_category: string
  prompt: string
  seed: number
}

function buildApiPayload(prompt: string, aspectRatio: string = "IMAGE_ASPECT_RATIO_LANDSCAPE", customSeed?: number): WhiskPayload {
  const sessionId = `;${Date.now()}`
  const finalSeed = customSeed !== undefined && customSeed > 0 
    ? customSeed 
    : Math.floor(Math.random() * 900000) + 100000

  return {
    client_context: {
      workflow_id: "be1451d0-1bb4-46ef-a1ac-07c89e3848d9",
      tool: "BACKBONE",
      session_id: sessionId,
    },
    image_model_settings: {
      image_model: "IMAGEN_3_5",
      aspect_ratio: aspectRatio,
    },
    media_category: "MEDIA_CATEGORY_BOARD",
    prompt: prompt,
    seed: finalSeed,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, bearerToken, aspectRatio, seed: customSeed } = body

    if (!prompt || !bearerToken) {
      return NextResponse.json({ success: false, error: "Missing prompt or bearer token" }, { status: 400 })
    }

    const payload = buildApiPayload(prompt, aspectRatio, customSeed)

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Whisk API error:", response.status, errorText)
      return NextResponse.json(
        {
          success: false,
          error: `Whisk API error: ${response.status} - ${errorText.substring(0, 200)}`,
        },
        { status: response.status },
      )
    }

    const responseData = await response.json()

    // Extract image data from response
    let imageBase64 = null
    let seed = "unknown"

    if (responseData.imagePanels && Array.isArray(responseData.imagePanels) && responseData.imagePanels.length > 0) {
      const firstPanel = responseData.imagePanels[0]
      seed = firstPanel.seed || seed

      if (
        firstPanel.generatedImages &&
        Array.isArray(firstPanel.generatedImages) &&
        firstPanel.generatedImages.length > 0
      ) {
        const firstImage = firstPanel.generatedImages[0]
        if (firstImage.encodedImage) {
          imageBase64 = firstImage.encodedImage
        }
      }
    }

    if (!imageBase64) {
      console.error("[v0] No encoded image found in response:", JSON.stringify(responseData).substring(0, 400))
      return NextResponse.json(
        {
          success: false,
          error: "No image data found in Whisk API response",
        },
        { status: 500 },
      )
    }

    // Convert base64 to data URL
    const imageUrl = `data:image/jpeg;base64,${imageBase64}`

    // Generate a custom title for the image
    let title = ""
    try {
      title = await generateTitle(prompt)
    } catch (titleError) {
      console.error("[v0] Failed to generate title:", titleError)
      // Continue even if title generation fails, use fallback
      title = prompt.substring(0, 50)
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      seed,
      prompt,
      title,
    })
  } catch (error) {
    console.error("[v0] Error in Whisk API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
