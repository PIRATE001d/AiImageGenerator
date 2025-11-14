"use client"

import Link from "next/link"
import { Sparkles, ImageIcon, Settings } from "lucide-react"
import { useState, useEffect } from "react"

export default function HomePage() {
  const [showSettings, setShowSettings] = useState(false)
  const [geminiApiKey, setGeminiApiKey] = useState("")
  const [whiskBearerToken, setWhiskBearerToken] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const savedGeminiKey = localStorage.getItem("gemini_api_key")
    const savedWhiskToken = localStorage.getItem("whisk_bearer_token")
    if (savedGeminiKey) setGeminiApiKey(savedGeminiKey)
    if (savedWhiskToken) setWhiskBearerToken(savedWhiskToken)
  }, [])

  const handleSaveSettings = () => {
    localStorage.setItem("gemini_api_key", geminiApiKey)
    localStorage.setItem("whisk_bearer_token", whiskBearerToken)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setShowSettings(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
          >
            <Settings className="w-5 h-5" />
            <span>API Settings</span>
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">AI Content Studio</h1>
          <p className="text-xl text-gray-300">Generate prompts and create images with AI-powered tools</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Prompt Generator Card */}
          <Link href="/prompt-generator">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-transparent hover:border-cyan-500 group">
              <div className="flex items-center justify-center w-16 h-16 bg-cyan-500 rounded-xl mb-6 group-hover:bg-cyan-400 transition-colors">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Prompt Generator</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Generate high-quality stock photography prompts using AI. Create prompts by category, keywords, or bulk
                generation with customizable detail levels.
              </p>
              <div className="flex items-center text-cyan-400 font-semibold group-hover:text-cyan-300">
                <span>Start Generating</span>
                <svg
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Whisk Image Generator Card */}
          <Link href="/whisk-generator">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-transparent hover:border-purple-500 group">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-500 rounded-xl mb-6 group-hover:bg-purple-400 transition-colors">
                <ImageIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Whisk Image Generator</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Generate images using Google Whisk API. Upload prompts from CSV, control generation timing, and batch
                process multiple images with ease.
              </p>
              <div className="flex items-center text-purple-400 font-semibold group-hover:text-purple-300">
                <span>Start Creating</span>
                <svg
                  className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">Powered by Google Gemini AI and Whisk API</p>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full border-2 border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">API Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-2">Gemini API Key</label>
                <p className="text-gray-400 text-sm mb-3">
                  Required for the Prompt Generator. Get your API key from{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    Google AI Studio
                  </a>
                </p>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Whisk Bearer Token</label>
                <p className="text-gray-400 text-sm mb-3">
                  Required for the Whisk Image Generator. Extract from browser DevTools when using Whisk.
                </p>
                <input
                  type="password"
                  value={whiskBearerToken}
                  onChange={(e) => setWhiskBearerToken(e.target.value)}
                  placeholder="Enter your Whisk bearer token"
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all"
                >
                  {saved ? "Saved!" : "Save Settings"}
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
