"use client"

import type React from "react"
import { useState } from "react"
import type { Prompt } from "../types"
import LoadingSpinner from "./LoadingSpinner"
import { Copy, Check, Trash2 } from "lucide-react"

interface PromptTableProps {
  prompts: Prompt[]
  isLoadingMore?: boolean
  onDeletePrompt?: (id: number) => void
  onEditPrompt?: (id: number, newText: string) => void
}

const PromptTable: React.FC<PromptTableProps> = ({ prompts, isLoadingMore, onDeletePrompt, onEditPrompt }) => {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState("")

  const handleCopy = (prompt: string, id: number) => {
    navigator.clipboard.writeText(prompt)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleEdit = (id: number, currentText: string) => {
    setEditingId(id)
    setEditText(currentText)
  }

  const handleSaveEdit = (id: number) => {
    if (onEditPrompt && editText.trim()) {
      onEditPrompt(id, editText.trim())
    }
    setEditingId(null)
    setEditText("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText("")
  }

  if (prompts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-700/30 rounded-lg">
        <div className="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-12 w-12 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-300">No prompts generated</h3>
          <p className="mt-1 text-sm text-gray-400">Use the controls to generate some ideas!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-auto h-[calc(100vh-250px)] rounded-lg border border-gray-700">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-700/50 sticky top-0 backdrop-blur-sm">
          <tr>
            <th scope="col" className="w-16 px-4 py-3.5 text-left text-sm font-semibold text-cyan-300">
              Id
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-cyan-300">
              Prompt
            </th>
            <th scope="col" className="w-32 px-3 py-3.5 text-right text-sm font-semibold text-cyan-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700 bg-gray-800">
          {prompts.map((p) => (
            <tr key={p.id} className="hover:bg-gray-700/50 transition-colors">
              <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-400">{p.id}</td>
              <td className="px-3 py-4 text-sm text-gray-200">
                {editingId === p.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(p.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-semibold"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  p.prompt
                )}
              </td>
              <td className="px-3 py-4 text-sm text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleCopy(p.prompt, p.id)}
                    className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                    title="Copy prompt"
                  >
                    {copiedId === p.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(p.id, p.prompt)}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    title="Edit prompt"
                  >
                    Edit
                  </button>
                  {onDeletePrompt && (
                    <button
                      onClick={() => onDeletePrompt(p.id)}
                      className="p-1.5 hover:bg-red-600 rounded transition-colors"
                      title="Delete prompt"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {isLoadingMore && (
        <div className="sticky bottom-0 flex justify-center items-center p-4 bg-gray-800/80 backdrop-blur-sm">
          <LoadingSpinner />
          <p className="ml-3 text-gray-300">Generating more prompts...</p>
        </div>
      )}
    </div>
  )
}

export default PromptTable
