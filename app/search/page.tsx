"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, ExternalLink, Loader2, Circle, Settings, ChevronDown, ChevronUp } from "lucide-react"

interface SearchResult {
  url: string
  title: string
  snippet: string
}

const DEFAULT_METHODOLOGY =
  "You will find articles about protest events, demonstrations, strikes, roadblocks, or anything related about the mining location."

export default function Home() {
  const [query, setQuery] = useState("")
  const [methodology, setMethodology] = useState(DEFAULT_METHODOLOGY)
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  const parseSearchResults = (logEntry: string): SearchResult[] | null => {
    try {
      const prefix = "Response: "
      if (!logEntry.startsWith(prefix)) return null

      const rawJson = logEntry.slice(prefix.length).trim()

      let parsed: any

      try {
        parsed = JSON.parse(rawJson)
      } catch {
        const cleaned = rawJson
          .replace(/^```json/, "")
          .replace(/```$/, "")
          .replace(/^"|"$/g, "")
          .replace(/\\"/g, '"')
          .replace(/\\n/g, "\n")

        parsed = JSON.parse(cleaned)
      }

      if (Array.isArray(parsed) && parsed.every((r) => r.url && r.title)) {
        return parsed
      }
    } catch (error) {
      console.error("Failed to parse search results:", error)
    }

    return null
  }

  const startResearch = () => {
    if (!query.trim()) return

    setLogs([])
    setSearchResults([])
    setIsSearching(true)

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Include both query and methodology in the API call
    const encodedQuery = encodeURIComponent(query)
    const encodedMethodology = encodeURIComponent(methodology)

    const baseUrl = "https://s25api.millerding.com"
    // const baseUrl = "http://localhost:8000"

    const source = new EventSource(
      `${baseUrl}/stream?query=${encodedQuery}&methodology=${encodedMethodology}`,
    )
    eventSourceRef.current = source

    source.onmessage = (event) => {
      const logEntry = event.data

      setLogs((prev) => {
        const results = parseSearchResults(logEntry)
        if (results) {
          setSearchResults(results)
          return [...prev, "✅ Received JSON response successfully"]
        }

        return [...prev, logEntry]
      })
    }

    source.onerror = () => {
      setLogs((prev) => [...prev, "Connection closed."])
      setIsSearching(false)
      source.close()
    }

    source.addEventListener("close", () => {
      setIsSearching(false)
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startResearch()
  }

  const getLogIcon = (log: string) => {
    if (log.includes("⏳")) return "⏳"
    if (log.includes("🚀")) return "🚀"
    if (log.includes("🤖")) return "🤖"
    if (log.includes("🔍")) return "🔍"
    if (log.includes("📨")) return "📨"
    if (log.includes("🏁")) return "🏁"
    if (log.includes("❌")) return "❌"
    if (log.includes("✅")) return "✅"
    return "•"
  }

  const cleanLogText = (log: string) => {
    return log.replace(/^[⏳🚀🤖🔍📨🏁❌✅]\s*/u, "")
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-black mb-2">Agentic Research Model</h1>
          <p className="text-gray-600 text-lg">AI-powered search and analysis tool</p>
        </div>

        {/* Search Form */}
        <div className="mb-8 space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 text-base border-gray-300 focus:border-gray-400 focus:ring-0 rounded-md"
                disabled={isSearching}
              />
            </div>
            <Button
              type="button"
              onClick={() => setIsMethodologyOpen(!isMethodologyOpen)}
              variant="outline"
              className="h-11 px-4 border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md"
              disabled={isSearching}
            >
              <Settings className="w-4 h-4 mr-2" />
              Methodology
              {isMethodologyOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </Button>
            <Button
              type="submit"
              disabled={!query.trim() || isSearching}
              className="h-11 px-6 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>

          {/* Methodology Editor - Smooth expand/collapse */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isMethodologyOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <Card className="border border-gray-200 shadow-none">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Research Methodology</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMethodology(DEFAULT_METHODOLOGY)}
                      className="text-xs text-gray-500 hover:text-gray-700 h-auto p-1"
                    >
                      Reset to default
                    </Button>
                  </div>
                  <Textarea
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    placeholder="Enter your research methodology..."
                    className="min-h-[100px] text-sm border-gray-300 focus:border-gray-400 focus:ring-0 rounded-md resize-none"
                    disabled={isSearching}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setIsMethodologyOpen(false)}
                      variant="outline"
                      size="sm"
                      className="text-sm border-gray-300 hover:bg-gray-50 text-gray-700"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Live Logs */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Circle
                className={`w-2 h-2 ${isSearching ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"}`}
              />
              <h2 className="text-lg font-medium text-black">Live Research Log</h2>
            </div>

            <Card className="border border-gray-200 shadow-none">
              <CardContent className="p-0">
                <div className="bg-gray-50 border-b border-gray-200 p-4 h-96 overflow-y-auto font-mono text-sm">
                  {logs.length === 0 ? (
                    <div className="text-gray-500 text-center mt-20">Enter a query and click search to begin</div>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, i) => (
                        <div key={i} className="flex items-start gap-3 text-gray-700">
                          <span className="flex-shrink-0 mt-0.5 text-gray-500">{getLogIcon(log)}</span>
                          <span className="flex-1">{cleanLogText(log)}</span>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Results */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-medium text-black">Search Results</h2>
              {searchResults.length > 0 && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                  {searchResults.length} results
                </Badge>
              )}
            </div>

            <Card className="border border-gray-200 shadow-none">
              <CardContent className="p-0">
                <div className="h-96 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="text-gray-500 text-center mt-20 p-6">
                      {isSearching ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Waiting for results...
                        </div>
                      ) : (
                        "Results will appear here after research is complete"
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {searchResults.map((result, i) => (
                        <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <h3 className="font-medium text-black leading-tight">{result.title}</h3>
                              <p className="text-sm text-gray-600 leading-relaxed">{result.snippet}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {result.url ? new URL(result.url).hostname : "Unknown"}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="flex-shrink-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
