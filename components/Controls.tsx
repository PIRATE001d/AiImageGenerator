"use client"

import type React from "react"
import { useState } from "react"
import { GenerationMode } from "../types"

interface ControlsProps {
  onGenerate: (mode: GenerationMode, options: any) => void
  isLoading: boolean
}

type Tab = "bulk" | "single" | "multi"
type ImageType = "photography" | "vector"

const Controls: React.FC<ControlsProps> = ({ onGenerate, isLoading }) => {
  const [activeTab, setActiveTab] = useState<Tab>("bulk")
  const [imageType, setImageType] = useState<ImageType>("photography")
  const [detailLevel, setDetailLevel] = useState<string>("Medium")
  const [humanPresence, setHumanPresence] = useState<string>("Any")

  const [bulkCount, setBulkCount] = useState<number>(50)
  const [singleCategory, setSingleCategory] = useState<string>("Animals")
  const [singleCount, setSingleCount] = useState<number>(20)
  const [multiCategories, setMultiCategories] = useState<string>("Nature\nTechnology\nBusiness\nFood\nLifestyle")
  const [multiCount, setMultiCount] = useState<number>(10)

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGenerate(GenerationMode.BULK, { count: bulkCount, detailLevel, humanPresence, imageType })
  }

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGenerate(GenerationMode.SINGLE_CATEGORY, {
      category: singleCategory,
      count: singleCount,
      detailLevel,
      humanPresence,
      imageType,
    })
  }

  const handleMultiSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const categories = multiCategories.split("\n").filter((c) => c.trim() !== "")
    if (categories.length > 0) {
      onGenerate(GenerationMode.MULTI_CATEGORY, {
        categories,
        countPerCategory: multiCount,
        detailLevel,
        humanPresence,
        imageType,
      })
    }
  }

  const TabButton: React.FC<{ tabId: Tab; label: string }> = ({ tabId, label }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`flex-1 py-2.5 text-sm font-medium leading-5 rounded-lg
        ${activeTab === tabId ? "bg-cyan-500 text-white shadow" : "text-gray-300 hover:bg-white/[0.12] hover:text-white"}
        focus:outline-none focus:ring-2 ring-offset-2 ring-offset-cyan-400 ring-white ring-opacity-60 transition-all`}
    >
      {label}
    </button>
  )

  const SharedOptions = () => (
    <>
      <div>
        <label htmlFor="image-type" className="block text-sm font-medium text-gray-300 mb-1">
          Image Type
        </label>
        <select
          id="image-type"
          value={imageType}
          onChange={(e) => setImageType(e.target.value as ImageType)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="photography">Stock Photography</option>
          <option value="vector">Vector / Logos / Icons</option>
        </select>
      </div>
      <div>
        <label htmlFor="detail-level" className="block text-sm font-medium text-gray-300 mb-1">
          Prompt Detail
        </label>
        <select
          id="detail-level"
          value={detailLevel}
          onChange={(e) => setDetailLevel(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="Short">Short & Punchy</option>
          <option value="Medium">Standard</option>
          <option value="Detailed">Detailed & Descriptive</option>
        </select>
      </div>
      <div>
        <label htmlFor="human-presence" className="block text-sm font-medium text-gray-300 mb-1">
          Human Presence
        </label>
        <select
          id="human-presence"
          value={humanPresence}
          onChange={(e) => setHumanPresence(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="Any">Any</option>
          <option value="Include">Include Humans</option>
          <option value="Exclude">Exclude Humans</option>
        </select>
      </div>
    </>
  )

  return (
    <div className="bg-gray-800 rounded-xl shadow-2xl p-6">
      <div className="bg-gray-700/50 rounded-lg p-1 flex space-x-1 mb-6">
        <TabButton tabId="bulk" label="Bulk Random" />
        <TabButton tabId="single" label="Single Category" />
        <TabButton tabId="multi" label="Multi-Category" />
      </div>

      <div>
        {activeTab === "bulk" && (
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div>
              <label htmlFor="bulk-count" className="block text-sm font-medium text-gray-300 mb-1">
                Number of Prompts
              </label>
              <input
                type="number"
                id="bulk-count"
                min="1"
                max="500"
                value={bulkCount}
                onChange={(e) => setBulkCount(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <SharedOptions />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Generating..." : "Generate Bulk"}
            </button>
          </form>
        )}

        {activeTab === "single" && (
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div>
              <label htmlFor="single-category" className="block text-sm font-medium text-gray-300 mb-1">
                Category / Keywords / Letters
              </label>
              <input
                type="text"
                id="single-category"
                value={singleCategory}
                onChange={(e) => setSingleCategory(e.target.value)}
                placeholder="e.g., Fitness, tech startup office, or A B C"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
              />
              <p className="text-xs text-gray-400 mt-1">Enter a category, multiple keywords, or letters (A, B, C)</p>
            </div>
            <div>
              <label htmlFor="single-count" className="block text-sm font-medium text-gray-300 mb-1">
                Number of Prompts
              </label>
              <input
                type="number"
                id="single-count"
                min="1"
                max="100"
                value={singleCount}
                onChange={(e) => setSingleCount(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <SharedOptions />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Generating..." : "Generate by Category"}
            </button>
          </form>
        )}

        {activeTab === "multi" && (
          <form onSubmit={handleMultiSubmit} className="space-y-4">
            <div>
              <label htmlFor="multi-categories" className="block text-sm font-medium text-gray-300 mb-1">
                Categories / Keywords / Letters (one per line)
              </label>
              <textarea
                id="multi-categories"
                rows={5}
                value={multiCategories}
                onChange={(e) => setMultiCategories(e.target.value)}
                placeholder="Nature&#10;tech startup office&#10;A, B, C&#10;Food"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
              />
              <p className="text-xs text-gray-400 mt-1">Mix categories, keywords, and letters - one per line</p>
            </div>
            <div>
              <label htmlFor="multi-count" className="block text-sm font-medium text-gray-300 mb-1">
                Prompts per Category
              </label>
              <input
                type="number"
                id="multi-count"
                min="1"
                max="50"
                value={multiCount}
                onChange={(e) => setMultiCount(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <SharedOptions />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Generating..." : "Generate Batch"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Controls
