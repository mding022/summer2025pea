"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Clock, FileText, Loader2, Save, LinkIcon, Map, X, Plus, Trash2, XIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Link from "next/link"

interface SearchResult {
  url: string
  title: string
  summary: string
  lang: string
  confidence: string
}

interface Rule {
  title: string
  content: string
}

export default function SearchDashboard() {
  const [query, setQuery] = useState("")
  const [currentResults, setCurrentResults] = useState<SearchResult[]>([])
  const [previousResults, setPreviousResults] = useState<SearchResult[]>([])
  const [rules, setRules] = useState<Rule[]>([
    {
      title: "",
      content: "",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("current")
  const [error, setError] = useState("")
  const [isMethodologyLoading, setIsMethodologyLoading] = useState(false)
  const [isUrlsLoading, setIsUrlsLoading] = useState(false)
  const [isExtractLoading, setIsExtractLoading] = useState(false)
  const [showUrlsModal, setShowUrlsModal] = useState(false)
  const [urlsList, setUrlsList] = useState<string[]>([])
  const initialMethodologyLoadedRef = useRef(false)
  const [isClearLoading, setIsClearLoading] = useState(false)

  const rulesToXML = (rulesArray: Rule[]): string => {
    const rulesXML = rulesArray
      .map(
        (rule) => `  <rule>
    <title>${rule.title}</title>
    <content>${rule.content}</content>
  </rule>`,
      )
      .join("\n")

    return `<rules>
${rulesXML}
</rules>`
  }

  // Parse XML format to rules array
  const parseXMLToRules = (xmlString: string): Rule[] => {
    try {
      // Simple regex parsing for the specific XML format
      const ruleMatches = xmlString.match(/<rule>[\s\S]*?<\/rule>/g)
      if (!ruleMatches) return []

      return ruleMatches.map((ruleXML) => {
        const titleMatch = ruleXML.match(/<title>([\s\S]*?)<\/title>/)
        const contentMatch = ruleXML.match(/<content>([\s\S]*?)<\/content>/)

        return {
          title: titleMatch ? titleMatch[1].trim() : "",
          content: contentMatch ? contentMatch[1].trim() : "",
        }
      })
    } catch (err) {
      console.error("Error parsing XML:", err)
      return []
    }
  }

  const fetchSearchResults = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError("")

    try {
      const searchParams = new URLSearchParams()
      searchParams.append("query", query)

      // Convert rules to XML format for the request
      const methodology = rulesToXML(rules)
      console.log(methodology)
      const response = await fetch(`http://localhost:8000/search?${searchParams.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ methodology }),
      })
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setCurrentResults(data)
    } catch (err) {
      setError("Failed to fetch search results. Please check if the server is running.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAllResults = async () => {
    if (activeTab === "previous") {
      setIsLoading(true)
    }

    try {
      const response = await fetch("http://localhost:8000/results")

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setPreviousResults(data)
    } catch (err) {
      console.error("Failed to fetch previous results:", err)
    } finally {
      if (activeTab === "previous") {
        setIsLoading(false)
      }
    }
  }

  const fetchMethodology = async () => {
    if (initialMethodologyLoadedRef.current) return

    setIsMethodologyLoading(true)
    try {
      const response = await fetch("http://localhost:8000/methodology")

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.text()
      const parsedRules = parseXMLToRules(data)
      if (parsedRules.length > 0) {
        setRules(parsedRules)
      }
      initialMethodologyLoadedRef.current = true
    } catch (err) {
      console.error("Failed to fetch methodology:", err)
    } finally {
      setIsMethodologyLoading(false)
    }
  }

  const fetchUrls = async () => {
    setIsUrlsLoading(true)
    try {
      const response = await fetch("http://localhost:8000/urls")

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.text()
      const urlsArray = JSON.parse(data.replace(/'/g, '"'))
      setUrlsList(urlsArray)
      setShowUrlsModal(true)
    } catch (err) {
      console.error("Failed to fetch URLs:", err)
      setError("Failed to fetch URLs. Please check if the server is running.")
    } finally {
      setIsUrlsLoading(false)
    }
  }

  const runExtract = async () => {
    setIsExtractLoading(true)
    try {
      const response = await fetch("http://localhost:8000/extract")

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const result = await response.text()

      if (result && result.trim() !== "null" && result.trim() !== "") {
        window.open("http://localhost:8000/map", "_blank")
      } else {
        setError("Extract operation failed or returned no result.")
      }
    } catch (err) {
      console.error("Failed to run extract:", err)
      setError("Failed to run extract. Please check if the server is running.")
    } finally {
      setIsExtractLoading(false)
    }
  }

  const clearResults = async () => {
    setIsClearLoading(true)
    try {
      const response = await fetch("http://localhost:8000/clear")

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()

      // Clear local state
      setCurrentResults([])
      setPreviousResults([])
      setQuery("")

      // Show success message briefly
      setError("")
      console.log(data.message) // You could also show this in a toast notification
    } catch (err) {
      console.error("Failed to clear results:", err)
      setError("Failed to clear results. Please check if the server is running.")
    } finally {
      setIsClearLoading(false)
    }
  }

  const addRule = () => {
    setRules([...rules, { title: "", content: "" }])
  }

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  const updateRule = (index: number, field: "title" | "content", value: string) => {
    const updatedRules = [...rules]
    updatedRules[index][field] = value
    setRules(updatedRules)
  }

  useEffect(() => {
    fetchAllResults()
    fetchMethodology()
  }, [])

  useEffect(() => {
    if (currentResults.length > 0) {
      fetchAllResults()
    }
  }, [currentResults])

  useEffect(() => {
    if (activeTab === "previous") {
      fetchAllResults()
    }
  }, [activeTab])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchSearchResults()
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="px-6 py-4 bg-white/70 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
            <Button onClick={clearResults} disabled={isClearLoading} variant="outline" className="gap-2">
              {isClearLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XIcon className="w-4 h-4" />}
              Clear Database
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 flex-grow">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold mb-2 tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
            Agentic Research Model
          </h1>
          <p className="text-lg text-slate-600 mb-8">Summer 2025 PEA - Search Tool</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white/70 backdrop-blur-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <Button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
            <Button
              onClick={fetchUrls}
              disabled={isUrlsLoading}
              variant="outline"
              className="gap-2 bg-white/70 backdrop-blur-sm border-slate-300"
            >
              {isUrlsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              Process URLs
            </Button>
            <Button
              onClick={runExtract}
              disabled={isExtractLoading}
              variant="outline"
              className="gap-2 bg-white/70 backdrop-blur-sm border-slate-300"
            >
              {isExtractLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Map className="h-4 w-4" />}
              Extract & Map (First Process URLs)
            </Button>
          </div>
        </form>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 border border-red-200"
          >
            {error}
            <Button onClick={() => setError("")} variant="ghost" size="sm" className="ml-2 h-auto p-1">
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-8 bg-white/70 backdrop-blur-sm">
            <TabsTrigger
              value="current"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Search className="h-4 w-4" />
              Current Search
            </TabsTrigger>
            <TabsTrigger
              value="previous"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Clock className="h-4 w-4" />
              Previous Searches
              {activeTab === "previous" && isLoading && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
            </TabsTrigger>
            <TabsTrigger
              value="methodology"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <FileText className="h-4 w-4" />
              Search Methodology
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center items-center py-20"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </motion.div>
              ) : currentResults.length > 0 ? (
                <motion.div
                  key="results"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-6"
                >
                  <h2 className="text-2xl font-semibold mb-2 text-slate-900">Results for: &quot;{query}&quot;</h2>
                  {currentResults.map((result, index) => (
                    <motion.div key={index} variants={itemVariants}>
                      <ResultCard result={result} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20 text-slate-600"
                >
                  Current search engine: <span className="font-bold text-blue-600">Google.</span>
                  <br />
                  <br />
                  All research is completed using model{" "}
                  <span className="font-bold text-blue-600">gemini-2.0-flash (Feb 25, 2025, Google)</span>, grounded by
                  Google Search.
                  <br />
                  Documentation for{" "}
                  <Link href={"https://ai.google.dev/gemini-api/docs/grounding?lang=python"} target="_blank">
                    <span className="underline text-blue-600 hover:text-blue-800">Grounding with Google Search</span>.
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="previous">
            <AnimatePresence mode="wait">
              {activeTab === "previous" && isLoading ? (
                <motion.div
                  key="loading-previous"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center items-center py-20"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </motion.div>
              ) : (
                <motion.div
                  key="previous-results"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid gap-6"
                >
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Previous Search Results
                    <div className="mb-2 text-sm text-slate-600">
                      Recent searches displayed first. AI provides a confidence judgement of relevance and accuracy.
                    </div>
                  </h2>
                  {previousResults.length > 0 ? (
                    [...previousResults].reverse().map((result, index) => (
                      <motion.div key={index} variants={itemVariants}>
                        <ResultCard result={result} />
                      </motion.div>
                    ))
                  ) : (
                    <motion.div variants={itemVariants} className="text-center py-20 text-slate-600">
                      No previous search results available.
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="methodology">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-1">Search Methodology</h2>
                  <p className="text-sm text-slate-600">
                    Define search rules with titles and descriptions. Changes are automatically saved.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-500 flex items-center">
                    {isMethodologyLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-1" />
                        Auto-saved
                      </>
                    )}
                  </div>
                  <Button
                    onClick={addRule}
                    size="sm"
                    className="gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-xs px-3 py-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Rule
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {rules.map((rule, index) => (
                  <div key={index} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Rule {index + 1}
                      </span>
                      {rules.length > 1 && (
                        <Button
                          onClick={() => removeRule(index)}
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={rule.title}
                        onChange={(e) => updateRule(index, "title", e.target.value)}
                        placeholder="Rule title..."
                        className="bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                      />
                      <Textarea
                        value={rule.content}
                        onChange={(e) => updateRule(index, "content", e.target.value)}
                        placeholder="Rule description..."
                        className="bg-white/50 border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-sm min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200">
                <details className="group">
                  <summary className="text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 transition-colors">
                    XML Preview
                  </summary>
                  <pre className="mt-2 text-xs text-slate-600 font-mono bg-slate-50 p-3 rounded border overflow-x-auto">
                    {rulesToXML(rules)}
                  </pre>
                </details>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showUrlsModal} onOpenChange={setShowUrlsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-900">List of grounded URLs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {urlsList.map((url, index) => (
              <div key={index} className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono text-slate-600">#{index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => window.open(url, "_blank")} className="gap-2">
                    <LinkIcon className="h-3 w-3" />
                    Open
                  </Button>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 break-all"
                >
                  {url}
                </a>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <footer className="w-full py-4 mt-8 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 text-center text-sm text-slate-500">
          Summer 2025 PEA Tool by Miller Ding for Dr. P. Haslam &amp; Dr. N. Ary.
        </div>
      </footer>
    </div>
  )
}

function ResultCard({ result }: { result: SearchResult }) {
  return (
    <div className="overflow-hidden bg-none backdrop-blur-sm border-slate-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="pb-2">
        <div className="text-xl">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors text-slate-900"
          >
            {result.title}
          </a>
        </div>
        <div className="text-sm text-slate-600">
          {result.url.length > 120 ? `${result.url.substring(0, 120)}...` : result.url}
        </div>
      </div>
      <div>
        <p className="text-slate-700">{result.summary}</p>
      </div>
      <div className="flex justify-between pt-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <div className="border-blue-200 text-blue-700 bg-blue-50">{result.lang}</div>
          <span>Confidence: {Number.parseFloat(result.confidence) * 100}%</span>
        </div>
      </div>
    </div>
  )
}
