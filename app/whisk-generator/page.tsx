"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Upload, Play, Pause, Download, Trash2, FileText, Settings, Home, FolderOpen } from "lucide-react"
import Link from "next/link"
import type { GeneratedImage } from "@/types"

export default function WhiskGeneratorPage() {
  const [prompts, setPrompts] = useState<string[]>([])
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Configuration
  const [delayBetweenRequests, setDelayBetweenRequests] = useState(10)
  const [batchSize, setBatchSize] = useState(1)
  const [bearerToken, setBearerToken] = useState("")
  const [aspectRatio, setAspectRatio] = useState<string>("IMAGE_ASPECT_RATIO_LANDSCAPE")
  const [customSeed, setCustomSeed] = useState<string>("")
  const [useRandomSeed, setUseRandomSeed] = useState<boolean>(true)
  const [showSettings, setShowSettings] = useState(false)

  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [selectedFolderName, setSelectedFolderName] = useState<string>("")
  const [supportsFileSystem, setSupportsFileSystem] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pauseRef = useRef(false)

  useEffect(() => {
    const savedToken = localStorage.getItem("whisk_bearer_token")
    if (savedToken) {
      setBearerToken(savedToken)
    }

    setSupportsFileSystem("showDirectoryPicker" in window)
  }, [])

  const handleBearerTokenChange = (value: string) => {
    setBearerToken(value)
    localStorage.setItem("whisk_bearer_token", value)
  }

  const handleSelectDirectory = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      })
      setDirectoryHandle(handle)
      setSelectedFolderName(handle.name)
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        alert("Failed to select directory: " + (error as Error).message)
      }
    }
  }

  const saveImageToDirectory = async (imageUrl: string, filename: string) => {
    if (!directoryHandle) return

    try {
      // Fetch the image
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      // Create file in the selected directory
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()

      console.log("[v0] Saved image to directory:", filename)
    } catch (error) {
      console.error("[v0] Failed to save image:", error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split("\n")

    // Parse CSV - skip header if it exists
    const parsedPrompts: string[] = []
    lines.forEach((line, index) => {
      if (index === 0 && line.toLowerCase().includes("prompt")) return // Skip header

      // Handle CSV format with quotes
      const match = line.match(/"([^"]+)"/)
      if (match) {
        parsedPrompts.push(match[1].trim())
      } else if (line.trim()) {
        // Handle simple text format
        const parts = line.split(",")
        const promptText = parts.length > 1 ? parts.slice(1).join(",").trim() : line.trim()
        if (promptText) parsedPrompts.push(promptText)
      }
    })

    setPrompts(parsedPrompts)
  }

  const handleManualPromptAdd = () => {
    const promptText = prompt("Enter a prompt:")
    if (promptText && promptText.trim()) {
      setPrompts([...prompts, promptText.trim()])
    }
  }

  const handleStartGeneration = async () => {
    if (prompts.length === 0) {
      alert("Please upload prompts first")
      return
    }

    if (!bearerToken.trim()) {
      alert("Please enter your Bearer Token in settings or configure it in the main menu API Settings")
      return
    }

    setIsGenerating(true)
    setIsPaused(false)
    pauseRef.current = false
    setCurrentIndex(0)

    // Process prompts in batches
    for (let i = 0; i < prompts.length; i += batchSize) {
      if (pauseRef.current) {
        setIsPaused(true)
        break
      }

      // Get the current batch of prompts
      const batch = prompts.slice(i, Math.min(i + batchSize, prompts.length))
      setCurrentIndex(i)

      // Create promises for all prompts in the batch
      const batchPromises = batch.map(async (promptText, batchIndex) => {
        const actualIndex = i + batchIndex
        const imageId = `img-${Date.now()}-${actualIndex}`

        // Determine the seed for THIS request
        // If random, generate a new random seed. Otherwise, use the custom seed.
        const seedForRequest = useRandomSeed
          ? Math.floor(Math.random() * 9999999) // Generate a random seed
          : customSeed ? parseInt(customSeed) : undefined // Use custom seed if available

        // Add pending image
        setGeneratedImages((prev) => [
          ...prev,
          {
            id: imageId,
            prompt: promptText,
            imageUrl: "",
            seed: seedForRequest?.toString() ?? "N/A", // Show the seed we are sending
            timestamp: Date.now(),
            status: "generating",
          },
        ])

        try {
          const response = await fetch("/api/whisk/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: promptText,
              bearerToken,
              aspectRatio,
              seed: seedForRequest, // Send the determined seed
            }),
          })

          const data = await response.json()

          if (response.ok && data.success) {
            setGeneratedImages((prev) =>
              prev.map((img) => {
                if (img.id !== imageId) return img

                // *** THIS IS THE FIX ***
                // Default to the seed we already have (from the 'generating' state)
                let finalSeed = img.seed 
                const rawApiSeed = data.seed

                // Check if the API returned a "real" seed.
                // "Real" means: not null, not undefined, not an empty string, and not the word "unknown".
                if (
                  rawApiSeed !== null &&
                  rawApiSeed !== undefined &&
                  rawApiSeed !== "" &&
                  String(rawApiSeed).toLowerCase() !== "unknown"
                ) {
                  // If it's real, use it.
                  finalSeed = String(rawApiSeed)
                }
                // *** END OF FIX ***

                return {
                  ...img, 
                  imageUrl: data.imageUrl,
                  seed: finalSeed, // Use the determined final seed
                  title: data.title,
                  status: "completed",
                }
              }),
            )

            if (directoryHandle && data.imageUrl) {
              const sanitizedPrompt = promptText.substring(0, 30).replace(/[^a-z0-9]/gi, "_")
              const sanitizedTitle = data.title ? data.title.substring(0, 20).replace(/[^a-z0-9]/gi, "_") : "notitle"
              const timestamp = Date.now()

              // *** ALSO FIXING FILE NAMING LOGIC ***
              // Default to the seed we sent to the API
              let finalSeedForFile = String(seedForRequest ?? "unknown")
              const rawApiSeed = data.seed

              // Use the same robust check for the filename
              if (
                  rawApiSeed !== null &&
                  rawApiSeed !== undefined &&
                  rawApiSeed !== "" &&
                  String(rawApiSeed).toLowerCase() !== "unknown"
                ) {
                  finalSeedForFile = String(rawApiSeed)
                }
              
              const filename = `${sanitizedTitle}_${sanitizedPrompt}_${finalSeedForFile}_${timestamp}.jpg`
              await saveImageToDirectory(data.imageUrl, filename)
            }
          } else {
            setGeneratedImages((prev) =>
              prev.map((img) =>
                img.id === imageId
                  ? {
                      ...img, // 'img' already has the correct seed
                      status: "error",
                      error: data.error || "Failed to generate image",
                    }
                  : img,
              ),
            )
          }
        } catch (error) {
          setGeneratedImages((prev) =>
            prev.map((img) =>
              img.id === imageId
                ? {
                    ...img, // 'img' already has the correct seed
                    status: "error",
                    error: error instanceof Error ? error.message : "Unknown error",
                  }
                : img,
            ),
          )
        }
      })

      // Wait for all prompts in the batch to complete
      await Promise.all(batchPromises)

      // Wait before next batch (not after the last batch)
      if (i + batchSize < prompts.length && !pauseRef.current) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests * 1000))
      }
    }

    setIsGenerating(false)
    setIsPaused(false)
  }


  const handlePauseResume = () => {
    pauseRef.current = !pauseRef.current
    setIsPaused(pauseRef.current)
  }

  const handleClearAll = () => {
    if (confirm("Clear all prompts and generated images?")) {
      setPrompts([])
      setGeneratedImages([])
      setCurrentIndex(0)
    }
  }

  const handleDownloadImages = async () => {
    const completedImages = generatedImages.filter((img) => img.status === "completed")

    if (completedImages.length === 0) {
      alert("No completed images to download")
      return
    }

    // Download images one by one with a small delay to avoid browser blocking
    for (let i = 0; i < completedImages.length; i++) {
      const img = completedImages[i]
      const link = document.createElement("a")
      link.href = img.imageUrl
      const sanitizedPrompt = img.prompt.substring(0, 50).replace(/[^a-z0-9]/gi, "_")
      link.download = `${sanitizedPrompt}_${img.seed}.jpg`
      link.click()

      // Wait 500ms between downloads to avoid browser blocking
      if (i < completedImages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  const handleDownloadAsZip = async () => {
    const completedImages = generatedImages.filter((img) => img.status === "completed")

    if (completedImages.length === 0) {
      alert("No completed images to download")
      return
    }

    alert("Downloading images one by one. Please wait and allow multiple downloads in your browser.")
    await handleDownloadImages()
  }

  const handleExportPrompts = () => {
    const csvContent = "Id,prompt\n" + prompts.map((p, i) => `${i + 1},"${p.replace(/"/g, '""')}"`).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "whisk_prompts.csv"
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <Home className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-purple-400">Whisk Image Generator</h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-purple-400">Configuration</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Delay Between Batches (seconds)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={delayBetweenRequests}
                  onChange={(e) => setDelayBetweenRequests(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">Time to wait between each batch of prompts</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Prompts Per Batch</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">Number of prompts to send simultaneously</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="IMAGE_ASPECT_RATIO_LANDSCAPE">Landscape (16:9)</option>
                  <option value="IMAGE_ASPECT_RATIO_PORTRAIT">Portrait (9:16)</option>
                  <option value="IMAGE_ASPECT_RATIO_SQUARE">Square (1:1)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Image dimensions for generation</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Seed Mode</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="radio"
                      checked={useRandomSeed}
                      onChange={() => setUseRandomSeed(true)}
                      className="accent-purple-500"
                    />
                    Random Seeds
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="radio"
                      checked={!useRandomSeed}
                      onChange={() => setUseRandomSeed(false)}
                      className="accent-purple-500"
                    />
                    Custom Seed
                  </label>
                </div>
              </div>
              {!useRandomSeed && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Custom Seed Value</label>
                  <input
                    type="number"
                    min="0"
                    max="999999"
                    value={customSeed}
                    onChange={(e) => setCustomSeed(e.target.value)}
                    placeholder="e.g., 123456"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">All images will use this seed for consistency</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bearer Token
                  {bearerToken && <span className="ml-2 text-green-400 text-xs">✓ Loaded</span>}
                </label>
                <input
                  type="password"
                  value={bearerToken}
                  onChange={(e) => handleBearerTokenChange(e.target.value)}
                  placeholder="Enter your API token"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Configure in{" "}
                  <Link href="/" className="text-purple-400 hover:text-purple-300">
                    main menu
                  </Link>{" "}
                  API Settings
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {supportsFileSystem ? (
              <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl p-6 border-2 border-blue-500/50 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <FolderOpen className="w-6 h-6 text-blue-400" />
                  <h2 className="text-lg font-bold text-blue-400">Auto-Save Location</h2>
                </div>
                <button
                  onClick={handleSelectDirectory}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
                >
                  <FolderOpen className="w-5 h-5" />
                  {selectedFolderName ? "Change Folder" : "Select Save Folder"}
                </button>
                {selectedFolderName ? (
                  <div className="mt-3 p-4 bg-green-900/30 border border-green-500 rounded-lg">
                    <p className="text-xs text-green-300 mb-1 font-semibold">✓ Auto-Save Active</p>
                    <p className="text-sm font-bold text-green-400">{selectedFolderName}</p>
                    <p className="text-xs text-green-300 mt-2">
                      All images will automatically save to this folder during generation
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                    <p className="text-xs text-blue-300">
                      Click above to select a folder where all generated images will be automatically saved
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-900/20 rounded-xl p-6 border-2 border-yellow-500/50">
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-6 h-6 text-yellow-400" />
                  <h2 className="text-lg font-bold text-yellow-400">Auto-Save Not Available</h2>
                </div>
                <p className="text-sm text-yellow-300 mb-3">
                  Your browser doesn't support automatic folder saving. Please use Chrome or Edge for this feature.
                </p>
                <p className="text-xs text-yellow-400">
                  You can still download images manually using the "Download All Images" button below.
                </p>
              </div>
            )}

            {/* Upload Section */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 text-purple-400">Upload Prompts</h2>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-semibold"
              >
                <Upload className="w-5 h-5" />
                Upload CSV File
              </button>
              <button
                onClick={handleManualPromptAdd}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5" />
                Add Manual Prompt
              </button>
              <div className="mt-4 text-sm text-gray-400">
                <p className="font-semibold text-white mb-1">Loaded Prompts: {prompts.length}</p>
                {prompts.length > 0 && (
                  <button onClick={handleExportPrompts} className="text-purple-400 hover:text-purple-300 underline">
                    Export as CSV
                  </button>
                )}
              </div>
            </div>

            {/* Generation Controls */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 text-purple-400">Generation Controls</h2>
              {!isGenerating ? (
                <button
                  onClick={handleStartGeneration}
                  disabled={prompts.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold"
                >
                  <Play className="w-5 h-5" />
                  Start Generation
                </button>
              ) : (
                <button
                  onClick={handlePauseResume}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors font-semibold"
                >
                  <Pause className="w-5 h-5" />
                  {isPaused ? "Resume" : "Pause"}
                </button>
              )}

              {isGenerating && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>
                      {currentIndex + batchSize > prompts.length ? prompts.length : currentIndex + batchSize} /{" "}
                      {prompts.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${((currentIndex + batchSize > prompts.length ? prompts.length : currentIndex + batchSize) / prompts.length) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Processing {batchSize} prompt{batchSize > 1 ? "s" : ""} at a time with {delayBetweenRequests}s delay
                    between batches
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {!directoryHandle && (
                  <button
                    onClick={handleDownloadImages}
                    disabled={generatedImages.filter((img) => img.status === "completed").length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download All Images
                  </button>
                )}
                {directoryHandle && (
                  <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
                    <p className="text-xs text-green-400 text-center">✓ Images auto-saving to: {selectedFolderName}</p>
                  </div>
                )}
                <button
                  onClick={handleClearAll}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear All
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4 text-purple-400">Statistics</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Images:</span>
                  <span className="font-semibold">{generatedImages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed:</span>
                  <span className="font-semibold text-green-400">
                    {generatedImages.filter((img) => img.status === "completed").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Failed:</span>
                  <span className="font-semibold text-red-400">
                    {generatedImages.filter((img) => img.status === "error").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Generating:</span>
                  <span className="font-semibold text-yellow-400">
                    {generatedImages.filter((img) => img.status === "generating").length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Generated Images */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-purple-400">Generated Images</h2>
              {generatedImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <FileText className="w-16 h-16 mb-4" />
                  <p className="text-lg">No images generated yet</p>
                  <p className="text-sm">Upload prompts and start generation</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {generatedImages.map((image) => (
                    <div key={image.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      {image.status === "completed" && (
                        <img
                          src={image.imageUrl || "/placeholder.svg"}
                          alt={image.prompt}
                          className="w-full h-48 object-cover rounded-lg mb-3"
                        />
                      )}
                      {image.status === "generating" && (
                        <div className="w-full h-48 bg-gray-600 rounded-lg mb-3 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
                        </div>
                      )}
                      {image.status === "error" && (
                        <div className="w-full h-48 bg-red-900/20 rounded-lg mb-3 flex items-center justify-center text-red-400">
                          <p className="text-sm">Failed to generate</p>
                        </div>
                      )}
                      {image.title && (
                        <div className="mb-2 p-2 bg-purple-900/30 border border-purple-500/50 rounded">
                          <p className="text-sm font-semibold text-purple-300">✨ {image.title}</p>
                        </div>
                      )}
                      <p className="text-sm text-gray-300 line-clamp-2 mb-2">{image.prompt}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        {/* This line will now display the seed correctly, even if it's 0 */}
                        <span>Seed: {image.seed || "N/A"}</span>
                        <span
                          className={`px-2 py-1 rounded ${
                            image.status === "completed"
                              ? "bg-green-900/30 text-green-400"
                              : image.status === "generating"
                                ? "bg-yellow-900/30 text-yellow-400"
                                : "bg-red-900/30 text-red-400"
                          }`}
                        >
                          {image.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}