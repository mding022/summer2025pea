"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, ExternalLink, Loader2, Circle, Settings, ChevronDown, ChevronUp, BookOpen, Database, Trash2, RefreshCw, FileText, List, Plus, X } from 'lucide-react'

// const BASE_URL = "http://localhost:8000"
const BASE_URL = "https://s25api.millerding.com"

interface SearchResult {
  url: string
  title: string
  snippet: string
}

interface DatabaseResult {
  id: number
  link: string
  search_query: string
  snippet: string
  title: string
}

interface CSVData {
  headers: string[]
  rows: string[][]
}

interface Rule {
  id: string
  title: string
  content: string
}

const DEFAULT_METHODOLOGY_RULES: Rule[] = [
  {
    id: "1",
    title: "Goal",
    content: "Search for protest events from local news agencies, journalists, and other relevant local articles related to this mine location."
  },
  {
    id: "2", 
    title: "Relevance",
    content: "Prioritize protests that are directly connected to the mine specified."
  },
  {
    id: "3",
    title: "Sources",
    content: "Focus on these domains first. If there is not enough relevant information, open the search to more domains: https://noalamina.org/, https://olca.cl/oca/index.php, https://www.minesandcommunities.org/, ejatlas.org"
  }
]

const PRESET_CATEGORIES = ["Protest Events", "Institutional Demands", "Institutional Responses"]

const PRESETS = {
  preset1: [
    {
      id: "1",
      title: "Goal",
      content: "Search for protest events from local news agencies, journalists, and other relevant local articles related to this mine location."
    },
    {
      id: "2", 
      title: "Relevance",
      content: "Prioritize protests that are directly connected to the mine specified."
    },
    {
      id: "3",
      title: "Sources",
      content: "Focus on these domains first. If there is not enough relevant information, open the search to more domains: https://noalamina.org/, https://olca.cl/oca/index.php, https://www.minesandcommunities.org/, ejatlas.org"
    }
  ],
  preset2: [
    {
      id: "1",
      title: "Goal",
      content: "Search for demands by individuals and civil society organizations on the courts and regulatory and administrative agencies of the state. This includes submitting legal complaints to the courts or bringing complaints to state regulatory agencies."
    },
    {
      id: "2",
      title: "Relevance", 
      content: "Prioritize articles describing lawsuits and other legal complaints directly affecting the mining project, mine location, or company owning the mine."
    },
    {
      id: "3",
      title: "Sources",
      content: "Focus on articles and journals that clearly describe a legal complaint or lawsuit being filed."
    }
  ],
  preset3: [
    {
      id: "1",
      title: "Goal",
      content: "Search for institutional responses by the courts and regulatory and administrative agencies of the state to complaints by individuals and civil society organizations."
    },
    {
      id: "2",
      title: "Relevance",
      content: "Prioritize articles describing government responses and actions related directly to protests, complaints, or other civil matters."
    },
    {
      id: "3",
      title: "Sources", 
      content: "Focus on articles and journals from official sources that clearly describe an official local government, agency, or court's response to complaints."
    }
  ]
}

export default function Home() {
  const [query, setQuery] = useState("")
  const [methodologyRules, setMethodologyRules] = useState<Rule[]>(DEFAULT_METHODOLOGY_RULES)
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false)
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [databaseResults, setDatabaseResults] = useState<DatabaseResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasProcessed, setHasProcessed] = useState(false)
  const [csvData, setCsvData] = useState<CSVData | null>(null)
  const [isLoadingCSV, setIsLoadingCSV] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false)
  const [batchQueries, setBatchQueries] = useState("")
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const [isManualAddDialogOpen, setIsManualAddDialogOpen] = useState(false)
  const [manualUrl, setManualUrl] = useState("")
  const [isAddingManualUrl, setIsAddingManualUrl] = useState(false)
  const [manualAddResult, setManualAddResult] = useState<{ message: string; result?: any } | null>(null)

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  const parseCSV = (csvText: string): CSVData => {
    const lines = csvText.trim().split("\n")

    const parseLine = (line: string) => {
      const result: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"' && inQuotes && nextChar === '"') {
          current += '"' // escaped quote
          i++
        } else if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          result.push(current)
          current = ""
        } else {
          current += char
        }
      }
      result.push(current)
      return result
    }

    const headers = parseLine(lines[0])
    const rows = lines.slice(1).map(parseLine)

    return { headers, rows }
  }

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
          .replace(/^\`\`\`json/, "")
          .replace(/\`\`\`$/, "")
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

  const convertRulesToXML = (rules: Rule[]): string => {
    let xml = "<methodology>\n"
    rules.forEach(rule => {
      xml += `  <rule id="${rule.id}">\n`
      xml += `    <title>${rule.title}</title>\n`
      xml += `    <content>${rule.content}</content>\n`
      xml += `  </rule>\n`
    })
    xml += "</methodology>"
    return xml
  }

  const fetchAllResults = async () => {
    setIsLoadingDatabase(true)
    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/all-search-results`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setDatabaseResults(data)
    } catch (error) {
      console.error("Failed to fetch database results:", error)
    } finally {
      setIsLoadingDatabase(false)
    }
  }

  const removeResult = async (resultId: number) => {
    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/remove/${resultId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setDatabaseResults((prev) => prev.filter((result) => result.id !== resultId))
    } catch (error) {
      console.error("Failed to remove result:", error)
    }
  }

  const processDatabase = async () => {
    setIsProcessing(true)
    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setHasProcessed(true)
      console.log("Database processed successfully")
    } catch (error) {
      console.error("Failed to process database:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const fetchCSVData = async () => {
    setIsLoadingCSV(true)
    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/resultscsv`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const csvText = await response.text()
      const parsedData = parseCSV(csvText)
      setCsvData(parsedData)
      setIsDialogOpen(true)
    } catch (error) {
      console.error("Failed to fetch CSV data:", error)
    } finally {
      setIsLoadingCSV(false)
    }
  }

  const processBatchQueries = async () => {
    const queries = batchQueries
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0)

    if (queries.length === 0) {
      return
    }

    setIsBatchProcessing(true)
    try {
      const baseUrl = BASE_URL
      const methodologyXML = convertRulesToXML(methodologyRules)
      
      const response = await fetch(`${baseUrl}/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: queries,
          methodology: methodologyXML,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log("Batch queries processed successfully")
      setIsBatchDialogOpen(false)
      setBatchQueries("")
      // Optionally refresh the database results
      if (isDatabaseOpen) {
        fetchAllResults()
      }
    } catch (error) {
      console.error("Failed to process batch queries:", error)
    } finally {
      setIsBatchProcessing(false)
    }
  }

  const startResearch = async () => {
    if (!query.trim()) return

    setLogs([])
    setSearchResults([])
    setIsSearching(true)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const baseUrl = BASE_URL
      const methodologyXML = convertRulesToXML(methodologyRules)

      const response = await fetch(`${baseUrl}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          methodology: methodologyXML,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body reader available")
      }

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          setIsSearching(false)
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.trim() === "") continue

          let logEntry = line
          if (line.startsWith("data: ")) {
            logEntry = line.slice(6)
          }

          if (logEntry.trim() === "") continue

          setLogs((prev) => {
            const results = parseSearchResults(logEntry)
            if (results) {
              setSearchResults(results)
              return [...prev, "✅ Received JSON response successfully"]
            }

            return [...prev, logEntry]
          })
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setLogs((prev) => [...prev, "Request cancelled."])
      } else {
        setLogs((prev) => [...prev, `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`])
      }
      setIsSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startResearch()
  }

  const handlePresetSelect = (presetKey: keyof typeof PRESETS) => {
    setMethodologyRules(PRESETS[presetKey])
  }

  const handleDatabaseToggle = () => {
    setIsDatabaseOpen(!isDatabaseOpen)
    if (!isDatabaseOpen && databaseResults.length === 0) {
      fetchAllResults()
    }
  }

  const addRule = () => {
    const newId = (Math.max(...methodologyRules.map(r => parseInt(r.id)), 0) + 1).toString()
    setMethodologyRules([...methodologyRules, { id: newId, title: "", content: "" }])
  }

  const removeRule = (id: string) => {
    setMethodologyRules(methodologyRules.filter(rule => rule.id !== id))
  }

  const updateRule = (id: string, field: 'title' | 'content', value: string) => {
    setMethodologyRules(methodologyRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ))
  }

  const resetToDefault = () => {
    setMethodologyRules(DEFAULT_METHODOLOGY_RULES)
  }

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

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

  const addManualUrl = async () => {
    if (!manualUrl.trim()) return

    setIsAddingManualUrl(true)
    setManualAddResult(null)

    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/add_manual_result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: manualUrl.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setManualAddResult(data)
      setManualUrl("")

      // Refresh database results if they're currently displayed
      if (isDatabaseOpen) {
        fetchAllResults()
      }
    } catch (error) {
      setManualAddResult({
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsAddingManualUrl(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-black mb-2">Agentic Research Model</h1>
          <p className="text-gray-600 text-lg">AI-powered search and analysis tool</p>
        </div>

        {/* Database Toggle Button */}
        <div className="mb-6">
          <Button
            type="button"
            onClick={handleDatabaseToggle}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 text-gray-700 bg-transparent"
            disabled={isSearching}
          >
            <Database className="w-4 h-4 mr-2" />
            View Database
            {isDatabaseOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        {/* Database Results Section */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out mb-8 ${
            isDatabaseOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <Card className="border border-gray-200 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-black">Database Results</CardTitle>
                <div className="flex items-center gap-2">
                  {databaseResults.length > 0 && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                      {databaseResults.length} results
                    </Badge>
                  )}
                  <Button
                    type="button"
                    onClick={processDatabase}
                    disabled={isProcessing || isLoadingDatabase}
                    className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-1 h-8"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        Processing...
                      </>
                    ) : (
                      "Process"
                    )}
                  </Button>
                  {hasProcessed && (
                    <Button
                      type="button"
                      onClick={fetchCSVData}
                      disabled={isLoadingCSV}
                      className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-1 h-8"
                    >
                      {isLoadingCSV ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-1" />
                          View Data
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => setIsManualAddDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 h-8"
                  >
                    Add URL
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchAllResults}
                    disabled={isLoadingDatabase}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {isLoadingDatabase ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                {isLoadingDatabase ? (
                  <div className="text-gray-500 text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading database results...
                  </div>
                ) : databaseResults.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">No results found in database</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {databaseResults.map((result) => (
                      <div key={result.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-black leading-tight">{result.title}</h3>
                              <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                                ID: {result.id}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{result.snippet}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {result.link ? new URL(result.link).hostname : "Unknown"}
                              </span>
                              <span className="text-xs text-gray-400">
                                Query:{" "}
                                {result.search_query.length > 50
                                  ? `${result.search_query.substring(0, 50)}...`
                                  : result.search_query}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="flex-shrink-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                              <a
                                href={result.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeResult(result.id)}
                              className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CSV Data Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-black">Processed Data Results</DialogTitle>
              <DialogDescription className="text-gray-600">
                CSV data from the processed database results
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-auto max-h-[60vh]">
              {csvData && (
                <div className="border border-gray-200 rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {csvData.headers.map((header, index) => (
                          <th
                            key={index}
                            className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {csvData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-3 py-2 text-gray-700 border-r border-gray-200 last:border-r-0"
                            >
                              {cell === "-999" ? <span className="text-gray-400 italic">N/A</span> : cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setIsDialogOpen(false)}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manual URL Addition Dialog */}
        <Dialog open={isManualAddDialogOpen} onOpenChange={setIsManualAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-black">Add Manual URL</DialogTitle>
              <DialogDescription className="text-gray-600">
                Enter a URL to manually add to the database
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="url"
                placeholder="https://example.com/article"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="text-sm border-gray-300 focus:border-gray-400 focus:ring-0 rounded-md"
                disabled={isAddingManualUrl}
              />

              {manualAddResult && (
                <div
                  className={`p-3 rounded-md text-sm ${
                    manualAddResult.message.includes("Error")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  <div className="font-medium mb-1">{manualAddResult.message}</div>
                  {manualAddResult.result && (
                    <div className="text-xs space-y-1">
                      <div>
                        <strong>Title:</strong> {manualAddResult.result.title || "N/A"}
                      </div>
                      <div>
                        <strong>Snippet:</strong> {manualAddResult.result.snippet || "N/A"}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setIsManualAddDialogOpen(false)
                    setManualUrl("")
                    setManualAddResult(null)
                  }}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50 text-gray-700"
                  disabled={isAddingManualUrl}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addManualUrl}
                  disabled={isAddingManualUrl || !manualUrl.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isAddingManualUrl ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    "Add URL"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Batch Search Dialog */}
        <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-black">Batch Search</DialogTitle>
              <DialogDescription className="text-gray-600">
                Enter multiple search queries, one per line. Each query will be processed using the current methodology.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={batchQueries}
                onChange={(e) => setBatchQueries(e.target.value)}
                placeholder={`Enter search queries, one per line:
quebrada blanca protests
pascua lama mining conflicts
antamina community opposition`}
                className="min-h-[200px] text-sm border-gray-300 focus:border-gray-400 focus:ring-0 rounded-md resize-none"
                disabled={isBatchProcessing}
              />
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {batchQueries.split("\n").filter((q) => q.trim().length > 0).length} queries
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsBatchDialogOpen(false)}
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-50 text-gray-700"
                    disabled={isBatchProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={processBatchQueries}
                    disabled={isBatchProcessing || !batchQueries.trim()}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    {isBatchProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      "Process Batch"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Search Form */}
        <div className="mb-8 space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Enter search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 text-base border-gray-300 focus:border-gray-400 focus:ring-0 rounded-md pr-12"
                disabled={isSearching}
              />
              <Button
                type="button"
                onClick={() => setIsBatchDialogOpen(true)}
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                disabled={isSearching}
              >
                <List className="w-4 h-4" />
              </Button>
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

          {/* Methodology Editor - Rule-based XML system */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isMethodologyOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <Card className="border border-gray-200 shadow-none">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Research Methodology Rules</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetToDefault}
                        className="text-xs text-gray-500 hover:text-gray-700 h-auto p-1"
                      >
                        Reset to default
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addRule}
                        className="text-xs border-gray-300 hover:bg-gray-50 text-gray-700 h-auto px-2 py-1"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Rule
                      </Button>
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <div className="flex items-center gap-2 mr-4">
                      <BookOpen className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Quick presets:</span>
                    </div>
                    {Object.entries(PRESETS).map(([key, value], index) => (
                      <Button
                        key={key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetSelect(key as keyof typeof PRESETS)}
                        className="text-xs border-gray-300 hover:bg-gray-50 text-gray-700"
                        disabled={isSearching}
                      >
                        {PRESET_CATEGORIES[index]}
                      </Button>
                    ))}
                  </div>

                  {/* Rules Editor */}
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {methodologyRules.map((rule) => (
                      <div key={rule.id} className="border border-gray-200 rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Rule {rule.id}</span>
                          {methodologyRules.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRule(rule.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Input
                            placeholder="Rule title (e.g., Goal, Relevance, Sources)"
                            value={rule.title}
                            onChange={(e) => updateRule(rule.id, 'title', e.target.value)}
                            className="text-sm border-gray-300 focus:border-gray-400 focus:ring-0 rounded-md"
                            disabled={isSearching}
                          />
                          <Textarea
                            placeholder="Rule content..."
                            value={rule.content}
                            onChange={(e) => updateRule(rule.id, 'content', e.target.value)}
                            className="min-h-[60px] text-sm border-gray-300 focus:border-gray-400 focus:ring-0 rounded-md resize-none"
                            disabled={isSearching}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

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
