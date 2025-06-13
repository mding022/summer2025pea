"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Clock,
  FileText,
  Loader2,
  Save,
  LinkIcon,
  Map,
  X,
  Plus,
  Trash2,
  XIcon,
  FileIcon,
  FolderIcon,
  ExternalLinkIcon,
  ChevronRight,
  ChevronDown,
  MapPin,
  Globe,
  Building,
  Navigation,
  AlertCircle,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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

interface FileItem {
  name: string
  path: string
  isFolder: boolean
  children?: FileItem[]
}

interface GISResponse {
  administrative_data: {
    "ISO3166-2-lvl4"?: string
    city?: string
    country?: string
    country_code?: string
    county?: string
    postcode?: string
    road?: string
    shop?: string
    state?: string
    state_district?: string
  }
  location_data: {
    lat?: number
    lon?: number
    name?: string
    source?: string
    error?: string
  }
  nearby_communities: Array<{
    lat: number
    lon: number
    name: string
  }>
  query: string
}

const baseUrl = "http://localhost:8000"

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
  const [files, setFiles] = useState<string[]>([])
  const [fileSystem, setFileSystem] = useState<FileItem[]>([])
  const [isFilesLoading, setIsFilesLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [deletingResults, setDeletingResults] = useState<Set<string>>(new Set())
  const [showGISModal, setShowGISModal] = useState(false)
  const [gisQuery, setGisQuery] = useState("")
  const [gisData, setGisData] = useState<GISResponse | null>(null)
  const [isGISLoading, setIsGISLoading] = useState(false)
  const [gisError, setGisError] = useState("")

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

  // Function to organize files into a folder structure
  const organizeFileSystem = (fileList: string[]): FileItem[] => {
    const root: FileItem[] = []
    const folderMap: Record<string, FileItem> = {}

    fileList.forEach((filePath) => {
      const parts = filePath.split("/")

      if (parts.length === 1) {
        // This is a file at the root level
        root.push({
          name: parts[0],
          path: parts[0],
          isFolder: false,
        })
      } else {
        // This is a file in a folder
        let currentPath = ""
        let parentFolder: FileItem | null = null

        // Process each folder in the path
        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i]
          const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName
          currentPath = folderPath

          if (!folderMap[folderPath]) {
            // Create new folder
            const newFolder: FileItem = {
              name: folderName,
              path: folderPath,
              isFolder: true,
              children: [],
            }
            folderMap[folderPath] = newFolder

            // Add to parent or root
            if (parentFolder) {
              parentFolder.children!.push(newFolder)
            } else {
              root.push(newFolder)
            }
          }

          parentFolder = folderMap[folderPath]
        }

        // Add the file to its parent folder
        if (parentFolder) {
          parentFolder.children!.push({
            name: parts[parts.length - 1],
            path: filePath,
            isFolder: false,
          })
        }
      }
    })

    return root
  }

  // Function to check if GIS data has valid location information
  const hasValidLocationData = (data: GISResponse): boolean => {
    return !!(
      data.location_data &&
      !data.location_data.error &&
      data.location_data.lat !== undefined &&
      data.location_data.lon !== undefined &&
      data.location_data.name
    )
  }

  // Function to check if administrative data has any meaningful content
  const hasAdministrativeData = (data: GISResponse): boolean => {
    return !!(
      data.administrative_data &&
      Object.keys(data.administrative_data).length > 0 &&
      Object.values(data.administrative_data).some((value) => value && value.trim() !== "")
    )
  }

  // Function to get error message from GIS response
  const getGISErrorMessage = (data: GISResponse): string => {
    if (data.location_data?.error) {
      return data.location_data.error
    }

    // Check if we have any meaningful data at all
    if (!hasValidLocationData(data) && !hasAdministrativeData(data) && data.nearby_communities.length === 0) {
      return "No location data found for this query. Please try a different search term or check the spelling."
    }

    return ""
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
      const response = await fetch(`${baseUrl}/search?${searchParams.toString()}`, {
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
      const response = await fetch(`${baseUrl}/results`)

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
      const response = await fetch(`${baseUrl}/methodology`)

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
      const response = await fetch(`${baseUrl}/urls`)

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

  const fetchFiles = async () => {
    if (activeTab === "files") {
      setIsFilesLoading(true)
    }

    try {
      const response = await fetch(`${baseUrl}/files`)

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setFiles(data)
      setFileSystem(organizeFileSystem(data))
    } catch (err) {
      console.error("Failed to fetch files:", err)
      if (activeTab === "files") {
        setError("Failed to fetch files. Please check if the server is running.")
      }
    } finally {
      if (activeTab === "files") {
        setIsFilesLoading(false)
      }
    }
  }

  const fetchGISData = async () => {
    if (!gisQuery.trim()) return

    setIsGISLoading(true)
    setGisError("")
    setGisData(null)

    try {
      const response = await fetch(`${baseUrl}/gis?query=${encodeURIComponent(gisQuery)}`)

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const data = await response.json()

      // Check for errors in the response data
      const errorMessage = getGISErrorMessage(data)
      if (errorMessage) {
        setGisError(errorMessage)
      } else {
        setGisData(data)
      }
    } catch (err) {
      console.error("Failed to fetch GIS data:", err)
      setGisError("Failed to connect to the GIS service. Please check if the server is running and try again.")
    } finally {
      setIsGISLoading(false)
    }
  }

  const openPdf = (filename: string) => {
    setSelectedFile(filename)
    setShowPdfModal(true)
  }

  const toggleFolder = (folderPath: string) => {
    const newExpandedFolders = new Set(expandedFolders)
    if (newExpandedFolders.has(folderPath)) {
      newExpandedFolders.delete(folderPath)
    } else {
      newExpandedFolders.add(folderPath)
    }
    setExpandedFolders(newExpandedFolders)
  }

  const runExtract = async () => {
    setIsExtractLoading(true)
    try {
      const response = await fetch(`${baseUrl}/extract`)

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const result = await response.text()

      if (result && result.trim() !== "null" && result.trim() !== "") {
        window.open(`${baseUrl}/map`, "_blank")
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
      const response = await fetch(`${baseUrl}/clear`)

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

  const deleteResult = async (url: string) => {
    const newDeletingResults = new Set(deletingResults)
    newDeletingResults.add(url)
    setDeletingResults(newDeletingResults)

    try {
      const response = await fetch(`${baseUrl}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      // Refresh the previous results after successful deletion
      await fetchAllResults()
    } catch (err) {
      console.error("Failed to delete result:", err)
      setError("Failed to delete result. Please check if the server is running.")
    } finally {
      const updatedDeletingResults = new Set(deletingResults)
      updatedDeletingResults.delete(url)
      setDeletingResults(updatedDeletingResults)
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

  const handleGISSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchGISData()
  }

  const resetGISModal = () => {
    setGisData(null)
    setGisError("")
    setGisQuery("")
  }

  useEffect(() => {
    fetchAllResults()
    fetchMethodology()
    fetchFiles()
  }, [])

  useEffect(() => {
    if (currentResults.length > 0) {
      fetchAllResults()
    }
  }, [currentResults])

  useEffect(() => {
    if (activeTab === "previous") {
      fetchAllResults()
    } else if (activeTab === "files") {
      fetchFiles()
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

  // Function to format filenames for display
  const formatFilename = (filename: string) => {
    // Get just the filename without the path
    const baseName = filename.split("/").pop() || filename

    // Replace underscores with spaces
    let formatted = baseName.replace(/_/g, " ")

    // Replace hyphens with spaces
    formatted = formatted.replace(/-/g, " ")

    // Remove common URL parts
    formatted = formatted.replace(/www\.|\.com|\.org|\.cl|index\.php/g, "")

    // Remove file extension
    formatted = formatted.replace(/\.pdf$/, "")

    return formatted
  }

  // Function to get domain from filename
  const getDomain = (filename: string) => {
    const baseName = filename.split("/").pop() || filename
    const domainMatch = baseName.match(/^([^_]+)/)
    return domainMatch ? domainMatch[1] : "unknown"
  }

  // Render file system items recursively
  const renderFileSystemItems = (items: FileItem[]) => {
    return items.map((item) => {
      if (item.isFolder) {
        const isExpanded = expandedFolders.has(item.path)
        return (
          <div key={item.path} className="mb-2">
            <div
              className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 cursor-pointer"
              onClick={() => toggleFolder(item.path)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
              <div className="bg-amber-50 text-amber-600 p-2 rounded-md">
                <FolderIcon className="h-5 w-5" />
              </div>
              <span className="font-medium text-slate-800">{item.name}</span>
            </div>
            {isExpanded && item.children && (
              <div className="pl-6 border-l border-slate-200 ml-3 mt-1">{renderFileSystemItems(item.children)}</div>
            )}
          </div>
        )
      } else {
        return (
          <div
            key={item.path}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 cursor-pointer ml-6"
            onClick={() => openPdf(item.path)}
          >
            <div className="bg-red-50 text-red-600 p-2 rounded-md">
              <FileIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">{formatFilename(item.name)}</div>
              <div className="text-xs text-slate-500">{getDomain(item.name)}</div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ExternalLinkIcon className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="px-6 py-4 bg-white/70 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
            <div className="flex gap-2">
              <Button onClick={clearResults} disabled={isClearLoading} variant="outline" className="gap-2">
                {isClearLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XIcon className="w-4 h-4" />}
                Clear Database
              </Button>
              <Button
                onClick={() => {
                  setShowGISModal(true)
                  resetGISModal()
                }}
                variant="outline"
                className="gap-2"
              >
                <MapPin className="w-4 h-4" />
                GIS Geocode
              </Button>
            </div>
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
              Extract & Map
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
          <TabsList className="grid grid-cols-4 mb-8 bg-white/70 backdrop-blur-sm">
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
              Search Database
              {activeTab === "previous" && isLoading && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
            </TabsTrigger>
            <TabsTrigger
              value="methodology"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <FileText className="h-4 w-4" />
              Search Methodology
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <FolderIcon className="h-4 w-4" />
              Documents
              {activeTab === "files" && isFilesLoading && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
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
                        <ResultCard
                          result={result}
                          onDelete={deleteResult}
                          isDeleting={deletingResults.has(result.url)}
                        />
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

          <TabsContent value="files">
            <AnimatePresence mode="wait">
              {activeTab === "files" && isFilesLoading ? (
                <motion.div
                  key="loading-files"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center items-center py-20"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </motion.div>
              ) : (
                <motion.div key="files-list" variants={containerVariants} initial="hidden" animate="visible">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900 mb-1">Document Drive</h2>
                      <p className="text-sm text-slate-600">View and access PDF documents related to your research.</p>
                    </div>
                    <Button onClick={fetchFiles} size="sm" variant="outline" className="gap-1 text-xs px-3 py-1">
                      <Loader2 className={`h-3 w-3 ${isFilesLoading ? "animate-spin" : "hidden"}`} />
                      <span>Refresh</span>
                    </Button>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 p-4">
                    {fileSystem.length > 0 ? (
                      <div className="space-y-1">{renderFileSystemItems(fileSystem)}</div>
                    ) : (
                      <div className="text-center py-10 text-slate-600">No documents available.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden bg-white/95 backdrop-blur-sm">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-slate-900 pr-8">{selectedFile && formatFilename(selectedFile)}</DialogTitle>
          </DialogHeader>
          <div className="h-[80vh]">
            {selectedFile && (
              <iframe
                src={`${baseUrl}/pdf?name=${encodeURIComponent(selectedFile)}`}
                className="w-full h-full border-0"
                title={selectedFile}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGISModal} onOpenChange={setShowGISModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              GIS Geocoding Service
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <form onSubmit={handleGISSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter location (e.g., Hillcrest Mall)"
                value={gisQuery}
                onChange={(e) => setGisQuery(e.target.value)}
                className="bg-white/70 backdrop-blur-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <Button
                type="submit"
                disabled={isGISLoading || !gisQuery.trim()}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isGISLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Geocode
              </Button>
            </form>

            {gisError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{gisError}</AlertDescription>
              </Alert>
            )}

            {gisData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <div className="text-lg font-semibold text-slate-900 mb-4">
                  Results for: &quot;{gisData.query}&quot;
                </div>

                {/* Location Data */}
                {hasValidLocationData(gisData) && (
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <Navigation className="h-5 w-5" />
                        Location Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-slate-600">Full Name</div>
                          <div className="text-slate-900">{gisData.location_data.name}</div>
                        </div>
                        {gisData.location_data.source && (
                          <div>
                            <div className="text-sm font-medium text-slate-600">Source</div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {gisData.location_data.source}
                            </Badge>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-slate-600">Latitude</div>
                          <div className="text-slate-900 font-mono">{gisData.location_data.lat!.toFixed(7)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-600">Longitude</div>
                          <div className="text-slate-900 font-mono">{gisData.location_data.lon!.toFixed(7)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Administrative Data */}
                {hasAdministrativeData(gisData) && (
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-700">
                        <Building className="h-5 w-5" />
                        Administrative Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(gisData.administrative_data).map(([key, value]) => {
                          if (!value || value.trim() === "") return null
                          return (
                            <div key={key}>
                              <div className="text-sm font-medium text-slate-600 capitalize">
                                {key.replace(/[-_]/g, " ").replace("ISO3166-2-lvl4", "ISO Code")}
                              </div>
                              <div className="text-slate-900">{value}</div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Nearby Communities */}
                {gisData.nearby_communities.length > 0 && (
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-700">
                        <Globe className="h-5 w-5" />
                        Nearby Communities ({gisData.nearby_communities.length})
                      </CardTitle>
                      <CardDescription>Communities in the surrounding area</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {gisData.nearby_communities.map((community, index) => (
                          <div
                            key={index}
                            className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 hover:bg-slate-100/70 transition-colors"
                          >
                            <div className="font-medium text-slate-900">{community.name}</div>
                            <div className="text-xs text-slate-600 font-mono mt-1">
                              {community.lat.toFixed(6)}, {community.lon.toFixed(6)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {isGISLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            )}
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

function ResultCard({
  result,
  onDelete,
  isDeleting,
}: {
  result: SearchResult
  onDelete?: (url: string) => void
  isDeleting?: boolean
}) {
  return (
    <div className="group overflow-hidden bg-none backdrop-blur-sm border-slate-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative">
      {onDelete && (
        <Button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(result.url)
          }}
          disabled={isDeleting}
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 h-8 w-8 p-0 bg-white/80 backdrop-blur-sm"
        >
          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </Button>
      )}
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
