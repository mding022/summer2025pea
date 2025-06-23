"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence } from "framer-motion"
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
  Menu,
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
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"

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

// const baseUrl = "https://service.millerding.com"
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [deletingResults, setDeletingResults] = useState<Set<string>>(new Set())
  const [showGISModal, setShowGISModal] = useState(false)
  const [gisQuery, setGisQuery] = useState("")
  const [gisData, setGisData] = useState<GISResponse | null>(null)
  const [isGISLoading, setIsGISLoading] = useState(false)
  const [gisError, setGisError] = useState("")
  const [methodologyVersion, setMethodologyVersion] = useState<1 | 2 | 3>(1)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

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

  const fetchMethodology = async (version: 1 | 2 | 3 = 1) => {
    setIsMethodologyLoading(true)
    try {
      const response = await fetch(`${baseUrl}/methodology?version=${version}`)

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.text()
      const parsedRules = parseXMLToRules(data)
      if (parsedRules.length > 0) {
        setRules(parsedRules)
      }
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
    fetchMethodology(1) // Load version 1 by default
    fetchFiles()
  }, [])

  useEffect(() => {
    fetchMethodology(methodologyVersion)
    initialMethodologyLoadedRef.current = true
  }, [methodologyVersion])

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
          <div key={item.path} className="mb-1">
            <div
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => toggleFolder(item.path)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FolderIcon className="h-4 w-4" />
              </div>
              <span className="font-medium text-gray-900 truncate">{item.name}</span>
            </div>
            {isExpanded && item.children && <div className="pl-7 mt-1">{renderFileSystemItems(item.children)}</div>}
          </div>
        )
      } else {
        return (
          <div
            key={item.path}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer ml-7 transition-colors group"
            onClick={() => openPdf(item.path)}
          >
            <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{formatFilename(item.name)}</div>
              <div className="text-sm text-gray-500 truncate">{getDomain(item.name)}</div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0">
              <ExternalLinkIcon className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    })
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-semibold text-gray-900">
                S25 PEA
              </Link>

              {/* Desktop Actions */}
              <div className="hidden md:flex gap-2">
                <Button onClick={clearResults} disabled={isClearLoading} variant="ghost" size="sm" className="gap-2">
                  {isClearLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XIcon className="w-4 h-4" />}
                  Clear Database
                </Button>
                <Button
                  onClick={() => {
                    setShowGISModal(true)
                    resetGISModal()
                  }}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Geocode
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>

            <ClerkProvider>
              <SignedOut>
                <SignInButton>
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </ClerkProvider>
          </div>

          {/* Mobile Actions Menu */}
          {showMobileMenu && (
            <div className="md:hidden mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
              <Button
                onClick={clearResults}
                disabled={isClearLoading}
                variant="ghost"
                size="sm"
                className="gap-2 justify-start"
              >
                {isClearLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XIcon className="w-4 h-4" />}
                Clear Database
              </Button>
              <Button
                onClick={() => {
                  setShowGISModal(true)
                  resetGISModal()
                  setShowMobileMenu(false)
                }}
                variant="ghost"
                size="sm"
                className="gap-2 justify-start"
              >
                <MapPin className="w-4 h-4" />
                GIS Geocode
              </Button>
            </div>
          )}
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Agentic Research Model</h1>
          <p className="text-gray-600">AI-powered search and analysis tool</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 text-base border-gray-200 focus:border-gray-900 focus:ring-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="h-12 px-4 sm:px-6 bg-gray-900 hover:bg-gray-800 text-white flex-1 sm:flex-none"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2 sm:hidden">Search</span>
              </Button>
              <Button
                onClick={fetchUrls}
                disabled={isUrlsLoading}
                variant="outline"
                className="h-12 px-3 sm:px-4 border-gray-200 hover:bg-gray-50"
              >
                {isUrlsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              </Button>
              <Button
                onClick={runExtract}
                disabled={isExtractLoading}
                variant="outline"
                className="h-12 px-3 sm:px-4 border-gray-200 hover:bg-gray-50"
              >
                {isExtractLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Map className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-red-800 break-words">{error}</p>
            </div>
            <Button onClick={() => setError("")} variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-6 sm:mb-8 bg-gray-100 p-1 rounded-lg w-full">
            <TabsTrigger
              value="current"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Current</span>
            </TabsTrigger>
            <TabsTrigger
              value="previous"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Database</span>
              {activeTab === "previous" && isLoading && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
            </TabsTrigger>
            <TabsTrigger
              value="methodology"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Methodology</span>
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-sm"
            >
              <FolderIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
              {activeTab === "files" && isFilesLoading && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : currentResults.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Results for "{query}"</h2>
                  {currentResults.map((result, index) => (
                    <ResultCard key={index} result={result} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <div className="max-w-md mx-auto px-4">
                    <p className="mb-4">
                      Powered by <span className="font-semibold text-gray-900">Gemini 2.0 Flash</span> with Google
                      Search grounding
                    </p>
                    <Link
                      href="https://ai.google.dev/gemini-api/docs/grounding?lang=python"
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Learn more about grounding
                    </Link>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="previous">
            <AnimatePresence mode="wait">
              {activeTab === "previous" && isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Search Database</h2>
                    <p className="text-gray-600">Previous searches with AI confidence scoring</p>
                  </div>
                  {previousResults.length > 0 ? (
                    <div className="space-y-4">
                      {[...previousResults].reverse().map((result, index) => (
                        <ResultCard
                          key={index}
                          result={result}
                          onDelete={deleteResult}
                          isDeleting={deletingResults.has(result.url)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-gray-500">No previous search results available.</div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="methodology">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Search Methodology</h2>
                  <p className="text-gray-600">Configure search rules and parameters</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="text-sm text-gray-500 flex items-center">
                    {isMethodologyLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-1" />
                        Saved
                      </>
                    )}
                  </div>
                  <Button
                    onClick={addRule}
                    size="sm"
                    className="bg-gray-900 hover:bg-gray-800 text-white w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Rule
                  </Button>
                </div>
              </div>

              {/* Methodology Version Tabs */}
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((version) => (
                  <Button
                    key={version}
                    onClick={() => setMethodologyVersion(version as 1 | 2 | 3)}
                    variant={methodologyVersion === version ? "default" : "outline"}
                    size="sm"
                    className={
                      methodologyVersion === version
                        ? "bg-gray-900 hover:bg-gray-800 text-white"
                        : "border-gray-200 hover:bg-gray-50"
                    }
                  >
                    Preset {version}
                  </Button>
                ))}
              </div>

              <div className="space-y-4">
                {rules.map((rule, index) => (
                  <div key={index} className="group p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-500">Rule {index + 1}</span>
                      {rules.length > 1 && (
                        <Button
                          onClick={() => removeRule(index)}
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Input
                        value={rule.title}
                        onChange={(e) => updateRule(index, "title", e.target.value)}
                        placeholder="Rule title..."
                        className="border-gray-200 focus:border-gray-900 focus:ring-gray-900"
                      />
                      <Textarea
                        value={rule.content}
                        onChange={(e) => updateRule(index, "content", e.target.value)}
                        placeholder="Rule description..."
                        className="border-gray-200 focus:border-gray-900 focus:ring-gray-900 min-h-[80px] resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <details className="group">
                <summary className="text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
                  XML Preview
                </summary>
                <pre className="mt-3 text-sm text-gray-600 font-mono bg-gray-50 p-4 rounded-lg border overflow-x-auto">
                  {rulesToXML(rules)}
                </pre>
              </details>
            </div>
          </TabsContent>

          <TabsContent value="files">
            <AnimatePresence mode="wait">
              {activeTab === "files" && isFilesLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Document Library</h2>
                      <p className="text-gray-600">Access research documents and PDFs</p>
                    </div>
                    <Button
                      onClick={fetchFiles}
                      size="sm"
                      variant="outline"
                      className="border-gray-200 hover:bg-gray-50 w-full sm:w-auto"
                    >
                      <Loader2 className={`h-4 w-4 mr-1 ${isFilesLoading ? "animate-spin" : "hidden"}`} />
                      Refresh
                    </Button>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    {fileSystem.length > 0 ? (
                      <div className="space-y-1">{renderFileSystemItems(fileSystem)}</div>
                    ) : (
                      <div className="text-center py-10 text-gray-500">No documents available.</div>
                    )}
                  </div>
                </div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals with mobile-friendly sizing */}
      <Dialog open={showUrlsModal} onOpenChange={setShowUrlsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Grounded URLs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {urlsList.map((url, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-gray-600">#{index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => window.open(url, "_blank")} className="gap-2">
                    <LinkIcon className="h-3 w-3" />
                    Open
                  </Button>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 break-all text-sm"
                >
                  {url}
                </a>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden mx-4 sm:mx-auto">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-gray-900 pr-8 truncate">
              {selectedFile && formatFilename(selectedFile)}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] sm:h-[80vh]">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              GIS Geocoding Service
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <form onSubmit={handleGISSubmit} className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                placeholder="Enter location (e.g., Hillcrest Mall)"
                value={gisQuery}
                onChange={(e) => setGisQuery(e.target.value)}
                className="border-gray-200 focus:border-gray-900 focus:ring-gray-900 flex-1"
              />
              <Button
                type="submit"
                disabled={isGISLoading || !gisQuery.trim()}
                className="bg-gray-900 hover:bg-gray-800 text-white w-full sm:w-auto"
              >
                {isGISLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2 sm:hidden">Search</span>
              </Button>
            </form>

            {gisError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{gisError}</AlertDescription>
              </Alert>
            )}

            {gisData && (
              <div className="space-y-4">
                <div className="text-lg font-semibold text-gray-900">Results for "{gisData.query}"</div>

                {/* Location Data */}
                {hasValidLocationData(gisData) && (
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <Navigation className="h-5 w-5" />
                        Location Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-600">Full Name</div>
                          <div className="text-gray-900 break-words">{gisData.location_data.name}</div>
                        </div>
                        {gisData.location_data.source && (
                          <div>
                            <div className="text-sm font-medium text-gray-600">Source</div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {gisData.location_data.source}
                            </Badge>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-600">Latitude</div>
                          <div className="text-gray-900 font-mono text-sm">{gisData.location_data.lat!.toFixed(7)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-600">Longitude</div>
                          <div className="text-gray-900 font-mono text-sm">{gisData.location_data.lon!.toFixed(7)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Administrative Data */}
                {hasAdministrativeData(gisData) && (
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-700">
                        <Building className="h-5 w-5" />
                        Administrative Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(gisData.administrative_data).map(([key, value]) => {
                          if (!value || value.trim() === "") return null
                          return (
                            <div key={key}>
                              <div className="text-sm font-medium text-gray-600 capitalize">
                                {key.replace(/[-_]/g, " ").replace("ISO3166-2-lvl4", "ISO Code")}
                              </div>
                              <div className="text-gray-900 break-words">{value}</div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Nearby Communities */}
                {gisData.nearby_communities.length > 0 && (
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-700">
                        <Globe className="h-5 w-5" />
                        Nearby Communities ({gisData.nearby_communities.length})
                      </CardTitle>
                      <CardDescription>Communities in the surrounding area</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {gisData.nearby_communities.map((community, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            <div className="font-medium text-gray-900 break-words">{community.name}</div>
                            <div className="text-xs text-gray-600 font-mono mt-1">
                              {community.lat.toFixed(6)}, {community.lon.toFixed(6)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {isGISLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer - Sticky to bottom */}
      <footer className="border-t border-gray-100 bg-gray-50 py-4 sm:py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-500">
          Summer 2025 PEA Tool by Miller Ding for Dr. P. Haslam & Dr. N. Ary
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
    <div className="group p-4 sm:p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 relative">
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
          className="absolute top-3 sm:top-4 right-3 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 h-8 w-8 p-0"
        >
          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </Button>
      )}

      <div className="space-y-3 pr-8 sm:pr-0">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors break-words"
            >
              {result.title}
            </a>
          </h3>
          <div className="text-sm text-gray-500 break-all">
            {result.url.length > 60 ? `${result.url.substring(0, 60)}...` : result.url}
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed break-words">{result.summary}</p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {result.lang}
            </Badge>
            <span className="text-sm text-gray-600">
              Confidence: {Math.round(Number.parseFloat(result.confidence) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
