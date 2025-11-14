"use client"

import { useState } from "react"
import { type Prompt, GenerationMode } from "@/types"
import * as geminiService from "@/services/geminiService"
import Header from "@/components/Header"
import Controls from "@/components/Controls"
import PromptTable from "@/components/PromptTable"
import LoadingSpinner from "@/components/LoadingSpinner"
import { Save, Upload } from "lucide-react"

export default function PromptGeneratorPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async (mode: GenerationMode, options: any) => {
    setIsLoading(true)
    setError(null)
    setPrompts([])

    const handleProgress = (newPromptStrings: string[]) => {
      setPrompts((prevPrompts) => {
        const lastId = prevPrompts.length > 0 ? prevPrompts[prevPrompts.length - 1].id : 0
        const formattedNewPrompts: Prompt[] = newPromptStrings.map((prompt, index) => ({
          id: lastId + index + 1,
          prompt: prompt,
        }))
        return [...prevPrompts, ...formattedNewPrompts]
      })
    }

    try {
      if (mode === GenerationMode.BULK) {
        await geminiService.generateBulkPrompts(
          options.count,
          options.detailLevel,
          options.humanPresence,
          handleProgress,
          options.imageType,
        )
      } else if (mode === GenerationMode.SINGLE_CATEGORY) {
        await geminiService.generateSingleCategoryPrompts(
          options.category,
          options.count,
          options.detailLevel,
          options.humanPresence,
          handleProgress,
          options.imageType,
        )
      } else if (mode === GenerationMode.MULTI_CATEGORY) {
        await geminiService.generateMultiCategoryPrompts(
          options.categories,
          options.countPerCategory,
          options.detailLevel,
          options.humanPresence,
          handleProgress,
          options.imageType,
        )
      }
    } catch (err) {
      console.error("Error generating prompts:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred. Check the console for details.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePrompt = (id: number) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleEditPrompt = (id: number, newText: string) => {
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, prompt: newText } : p)))
  }

  const handleDownloadCsv = () => {
    if (prompts.length === 0) return

    const header = "Id,prompt\n"
    const csvContent = prompts
      .map((p) => {
        const escapedPrompt = `"${p.prompt.replace(/"/g, '""')}"`
        return `${p.id},${escapedPrompt}`
      })
      .join("\n")

    const blob = new Blob([header + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    if (link.href) {
      URL.revokeObjectURL(link.href)
    }
    link.href = URL.createObjectURL(blob)
    link.download = "stock_prompts.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSaveToStorage = () => {
    if (prompts.length === 0) return
    localStorage.setItem("saved_prompts", JSON.stringify(prompts))
    alert("Prompts saved to browser storage!")
  }

  const handleLoadFromStorage = () => {
    const saved = localStorage.getItem("saved_prompts")
    if (saved) {
      try {
        const loadedPrompts = JSON.parse(saved)
        setPrompts(loadedPrompts)
        alert(`Loaded ${loadedPrompts.length} prompts from storage!`)
      } catch (err) {
        alert("Failed to load prompts from storage")
      }
    } else {
      alert("No saved prompts found in storage")
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 font-sans antialiased">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Controls onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold text-cyan-400">Generated Prompts</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveToStorage}
                    disabled={prompts.length === 0 || isLoading}
                    className="px-3 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    title="Save to browser storage"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleLoadFromStorage}
                    disabled={isLoading}
                    className="px-3 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    title="Load from browser storage"
                  >
                    <Upload className="w-4 h-4" />
                    Load
                  </button>
                  <button
                    onClick={handleDownloadCsv}
                    disabled={prompts.length === 0 || isLoading}
                    className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    Download CSV
                  </button>
                </div>
              </div>
              <div className="flex-grow relative">
                {isLoading && prompts.length === 0 && (
                  <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col justify-center items-center rounded-lg z-10">
                    <LoadingSpinner />
                    <p className="mt-4 text-lg text-gray-300">Generating ideas...</p>
                  </div>
                )}
                {error && (
                  <div className="flex items-center justify-center h-full bg-red-900/20 rounded-lg p-4">
                    <p className="text-red-400 text-center">{error}</p>
                  </div>
                )}
                {!(isLoading && prompts.length === 0) && !error && (
                  <PromptTable
                    prompts={prompts}
                    isLoadingMore={isLoading && prompts.length > 0}
                    onDeletePrompt={handleDeletePrompt}
                    onEditPrompt={handleEditPrompt}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
