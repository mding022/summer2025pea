"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  ExternalLink,
  Loader2,
  Circle,
  Settings,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Database,
  Trash2,
  RefreshCw,
  FileText,
  List,
  Plus,
  X,
  Globe,
  FolderOpen,
  Download,
} from "lucide-react"

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
    content:
      "Search for protest events from local news agencies, journalists, and other relevant local articles related to this mine location.",
  },
  {
    id: "2",
    title: "Relevance",
    content: "Prioritize protests that are directly connected to the mine specified.",
  },
  {
    id: "3",
    title: "Sources",
    content:
      "Focus on these domains first. If there is not enough relevant information, open the search to more domains: https://noalamina.org/, https://olca.cl/oca/index.php, https://www.minesandcommunities.org/",
  },
]

const PRESET_CATEGORIES = ["Protest Events", "Institutional Demands", "Institutional Responses"]

const PRESETS = {
  preset1: [
    {
      id: "1",
      title: "Methodology",
      content:
        "Search for protest events. A protest event is a public political action by a group of people who make demands on authorities such as companies, political actors and the state.",
    },
    {
      id: "2",
      title: "Countries to Search In",
      content: "**CRITICAL**: You must only search for content related to Argentina, Chile, and Peru.",
    },
    {
      id: "3",
      title: "**CRITICAL** Related Industries",
      content:
        "Limit the search to protest events against mining companies and mining projects. Do not include oil and gas projects in the search.",
    },
    {
      id: "5",
      title: "Whitelisted Sources",
      content:
        "First, search for results on these websites. olca.cl, and www.minesandcommunities.org. After, search for results on these websites only after the previous searches do not provide enough results, by using multiple OR statements. The domains are:\nhttps://www.lanacion.com.ar/\nhttps://www.clarin.com/\nhttps://www.larazon.es/\nhttps://www.cronista.com/\nhttps://www.diariouno.com.ar/\nhttps://www.diarioregistrado.com/\nhttps://www.minutouno.com/\nhttp://www.nochepolar.com/\nhttps://www.ambito.com/\nhttps://noticiasargentinas.com/\nhttps://www.perfil.com/\nhttps://www.pagina12.com.ar/\nhttps://www.lacuarta.com/temas/argentina/\nhttps://elsigloweb.com/\nhttps://www.lun.com/\nhttps://www.elancasti.com.ar/\nhttps://www.elesquiu.com/\nhttps://www.diariodecuyo.com.ar/\nhttps://www.tiempodesanjuan.com/\nhttps://www.tiemposur.com.ar/\nhttps://www.eltribuno.com/\nhttps://www.anred.org/\nhttps://palpalainforma.com/\nhttps://www.copenoa.com.ar/\nhttps://latinta.com.ar/\nhttps://elresaltador.com.ar/\nhttps://enredaccion.com.ar/\nhttps://argentina.indymedia.org/\nhttps://periodicas.com.ar/\nhttps://www.tiempoar.com.ar/\nhttps://suresnoticias.com.ar/\nhttps://www.cordobatimes.com/\nhttps://www.ocmal.org/\nhttps://olca.cl/oca/index.php\nhttps://www.minesandcommunities.org/\nhttps://www.redlatinoamericanademujeres.org/\nhttps://www.aomaosam.org.ar/aoma/\nhttps://www.argentina.gob.ar/justicia/institucional\nhttps://www.argentina.gob.ar/capital-humano/trabajo\nhttps://noalamina.org/\nhttps://concienciasolidaria.org.ar/es/\nhttps://asambleasdecomunidades.org.ar/\nhttps://miningpress.com/\nhttps://enernews.com/\nhttps://www.panorama-minero.com\nhttps://huellaminera.com/\nhttps://www.mining.com/\nhttps://www.mining-journal.com/\nhttps://im-mining.com/\nhttps://www.mch.cl/\nhttps://energiminas.com/\nhttps://www.portalminero.com/\nhttps://www.bnamericas.com/",
    },
    {
      id: "6",
      title: "Time Period",
      content: "Only search for content related to events that occurred within the time period of 2002 to 2019.",
    },
  ],
  preset2: [
    {
      id: "1",
      title: "Methodology",
      content:
        "Search for demands by individuals and civil society organizations on the courts and regulatory and administrative agencies of the state. This includes submitting legal complaints to the courts or bringing complaints to state regulatory agencies.",
    },
    {
      id: "2",
      title: "Countries to Search In",
      content: "**CRITICAL**: You must only search for content related to Argentina, Chile, and Peru.",
    },
    {
      id: "3",
      title: "**CRITICAL** Related Industries",
      content:
        "Limit the search to demands or complaints against mining companies and mining projects. Do not include oil and gas projects in the search.",
    },
    {
      id: "4",
      title: "Keywords to Search For",
      content:
        "Keywords describing complaints include: claim / demand / accusation (denuncia); regulatory claim (denuncia ante las autoridades / reclamación ante las autoridades); formal claim (reclamo formal / presentación ante autoridades); queja (complaint); claim of pollution (denuncia de contaminación); claim of spill (denuncia de derrame); environmental crime (delito ambiental).\n\nKeywords describing legal complaints include: violation of rights (violación de derechos); abuse of rights (abuso de derechos); lack of respect for rights (falta de respeto por los derechos); right to prior consultation (derecho a la consulta previa); right to water (derecho al agua); right to a clean environment (derecho a un medio ambiente limpio); protection (amparo); constitutional protection appeal (recurso de amparo); judicial submission (demanda judicial / querella); criminal complaint (denuncia penal); precautionary measure (cautelar / medida cautelar); appeal for unconstitutionality (recurso de inconstitucionalidad); appeal (recurso de apelación / revisión / casación); class action (acción colectiva); strategic litigation (litigio estratégico); judicial presentation (presentación judicial); petition (petición); counterclaim (reconvención); legal remedy (recurso); motion for clarification (recurso de aclaración); administrative appeal (recurso de alzada); motion for reconsideration (recurso de reposición); appeal for reconsideration (recurso de súplica); demand (requerimiento); litigation (pleito); question (interpelación).",
    },
    {
      id: "5",
      title: "Time Period",
      content: "Only search for demands or complaints that occurred within the time period of 2002 to 2019.",
    },
  ],
  preset3: [
    {
      id: "1",
      title: "Methodology",
      content:
        "Search for institutional responses by the courts and regulatory and administrative agencies of the state to complaints by individuals and civil society organizations.",
    },
    {
      id: "2",
      title: "Countries to Search In",
      content: "**CRITICAL**: You must only search for content related to Argentina, Chile, and Peru.",
    },
    {
      id: "3",
      title: "**CRITICAL** Related Industries",
      content:
        "Limit the search to institutional responses that affect mining companies. Do not include oil and gas projects in the search.",
    },
    {
      id: "4",
      title: "Keywords to Search For",
      content:
        "Keywords describing institutional responses by regulatory agencies include: environmental inspection (inspección ambiental); mitigation (mitigación); pasivo ambiental (environmental liability); plan de contingencia (contingency plan); environmental audit (auditoría ambiental); final disposition (disposición final); monitoring (monitoreo); certificate (acta / resolución); administrative act (acto administrativo); arbitration (arbitraje); public consultation (audiencia pública / consulta pública); workshop (mesa de trabajo); encumbrance / charge (gravamen); fine (multa); restoration (restauración); environmental clean-up (saneamiento ambiental); revocation of environmental licence (revocación de licencia ambiental / revocación de resolución de calificación ambiental); formulation of charges (formulación de cargos); compliance program (programa de cumplimiento); contaminants criteria (contaminantes criterio); environmental monitoring (fiscalización ambiental); temporary measures (medidas providenciales); self-reporting (autodenuncia); noncompliance (incumplimiento); mining protection (amparo minero); environmental certificate (certificación ambiental); environmental management audit (auditoría de gestión ambiental); polluted area (zona saturada).\n\nKeywords describing institutional responses by the courts include: arbitration award (laudo); nullity of proceedings (nulidad de actuaciones); invitation to take legal action (ofrecimiento de acciones); enabling (habilitación); preliminary ruling (prejudicial); prescription (prescripción); breach (quebramiento); breach of sentence (quebramiento de condena); procedural irregularity / breach of procedure (quebramiento de forma); cessation (casación); precautionary measure (medida cautelar); withdrawal (desistimiento); decree (decreto); edict (edicto); ruling (fallo); final ruling / final judgement (firme).",
    },
    {
      id: "5",
      title: "Time Period",
      content: "Only search for institutional responses that occurred within the time period of 2002 to 2019.",
    },
  ],
}

const COUNTRIES = [
  { code: "AR", name: "Argentina" },
  { code: "CI", name: "Chile" },
  { code: "PE", name: "Peru" },
]

const KEYWORD_TYPES = ["mining", "demand", "response"]

export default function Home() {
  const [query, setQuery] = useState("")
  const [methodologyRules, setMethodologyRules] = useState<Rule[]>(DEFAULT_METHODOLOGY_RULES)
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false)
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false)
  const [isDriveOpen, setIsDriveOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [databaseResults, setDatabaseResults] = useState<DatabaseResult[]>([])
  const [driveFiles, setDriveFiles] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false)
  const [isLoadingDrive, setIsLoadingDrive] = useState(false)
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
  const [isClearingSession, setIsClearingSession] = useState(false)

  const [isManualAddDialogOpen, setIsManualAddDialogOpen] = useState(false)
  const [manualUrl, setManualUrl] = useState("")
  const [isAddingManualUrl, setIsAddingManualUrl] = useState(false)
  const [manualAddResult, setManualAddResult] = useState<{ message: string; result?: any } | null>(null)

  const [isManualAddPdfDialogOpen, setIsManualAddPdfDialogOpen] = useState(false)
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null)
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [pdfUploadResult, setPdfUploadResult] = useState<{ message: string; result?: any } | null>(null)

  // GDELT Search State
  const [gdeltQuery, setGdeltQuery] = useState("")
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedKeywordTypes, setSelectedKeywordTypes] = useState<string[]>([])
  const [gdeltResults, setGdeltResults] = useState<string[]>([])
  const [isGdeltSearching, setIsGdeltSearching] = useState(false)
  const [selectedGdeltResults, setSelectedGdeltResults] = useState<string[]>([])
  const [isAddingGdeltResults, setIsAddingGdeltResults] = useState(false)

  // PDF Viewer State
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState("")
  const [currentPdfName, setCurrentPdfName] = useState("")

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

  const convertRulesToXML = (rules: Rule[]): string => {
    let xml = "<methodology>\n"
    rules.forEach((rule) => {
      xml += `  <rule id="${rule.id}">\n`
      xml += `    <title>${rule.title}</title>\n`
      xml += `    <content>${rule.content}</title>\n`
      xml += `  </rule>\n`
    })
    xml += "</methodology>"
    return xml
  }

  // Fetch drive files
  const fetchDriveFiles = async () => {
    setIsLoadingDrive(true)
    try {
      const response = await fetch(`${BASE_URL}/files`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const files = await response.json()
      setDriveFiles(files)
    } catch (error) {
      console.error("Failed to fetch drive files:", error)
    } finally {
      setIsLoadingDrive(false)
    }
  }

  // Open PDF viewer
  const openPdf = (fileName: string) => {
    const pdfUrl = `${BASE_URL}/pdf?name=${encodeURIComponent(fileName)}`
    setCurrentPdfUrl(pdfUrl)
    setCurrentPdfName(fileName)
    setIsPdfDialogOpen(true)
  }

  // Download PDF
  const downloadPdf = () => {
    if (currentPdfUrl && currentPdfName) {
      const link = document.createElement("a")
      link.href = currentPdfUrl
      link.download = currentPdfName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Update these functions in your Next.js component:

  // 1. Fix fetchAllResults function
  const fetchAllResults = async () => {
    setIsLoadingDatabase(true)
    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/all-search-results`, {
        credentials: "include", // Add this line
      })

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

  // 2. Fix removeResult function
  const removeResult = async (resultId: number) => {
    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/remove/${resultId}`, {
        method: "DELETE",
        credentials: "include", // Add this line
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setDatabaseResults((prev) => prev.filter((result) => result.id !== resultId))
    } catch (error) {
      console.error("Failed to remove result:", error)
    }
  }

  const clearSessionResults = async () => {
    try {
      const response = await fetch(`${BASE_URL}/clear-session-results`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(data.message)

      // Clear the local state
      setDatabaseResults([])

      return data
    } catch (error) {
      console.error("Failed to clear session results:", error)
      throw error
    }
  }

  const handleClearSession = async () => {
    if (!window.confirm("Are you sure you want to clear all your search results? This action cannot be undone.")) {
      return
    }

    setIsClearingSession(true)
    try {
      const result = await clearSessionResults()
      // Optionally show success message
      console.log(`Cleared ${result.deleted_count} results from session ${result.session_id}`)
    } catch (error) {
      console.error("Failed to clear session results:", error)
    } finally {
      setIsClearingSession(false)
    }
  }

  // 3. Fix processDatabase function
  const processDatabase = async () => {
    setIsProcessing(true)
    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Add this line
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

  // 4. Fix fetchCSVData function
  const fetchCSVData = async () => {
    setIsLoadingCSV(true)
    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/resultscsv`, {
        credentials: "include", // Add this line
      })

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

  // 5. Fix addManualUrl function
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
        credentials: "include", // Add this line
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

  const addManualPdf = async () => {
    if (!selectedPdfFile) return

    setIsUploadingPdf(true)
    setPdfUploadResult(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedPdfFile)

      const response = await fetch(`${BASE_URL}/add_manual_pdf`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setPdfUploadResult(data)
      setSelectedPdfFile(null)

      // Refresh database results if they're currently displayed
      if (isDatabaseOpen) {
        fetchAllResults()
      }
    } catch (error) {
      setPdfUploadResult({
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsUploadingPdf(false)
    }
  }

  const handleGdeltResultSelection = (url: string, checked: boolean) => {
    if (checked) {
      setSelectedGdeltResults([...selectedGdeltResults, url])
    } else {
      setSelectedGdeltResults(selectedGdeltResults.filter((u) => u !== url))
    }
  }

  const addSelectedGdeltResults = async () => {
    if (selectedGdeltResults.length === 0) return

    setIsAddingGdeltResults(true)

    try {
      const baseUrl = BASE_URL
      let successCount = 0
      let errorCount = 0

      for (const url of selectedGdeltResults) {
        try {
          const response = await fetch(`${baseUrl}/add_manual_result`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: url.trim(),
            }),
            credentials: "include",
          })

          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
          console.error(`Failed to add URL ${url}:`, error)
        }
      }

      console.log(`Added ${successCount} URLs successfully, ${errorCount} failed`)

      // Clear selections after adding
      setSelectedGdeltResults([])

      // Refresh database results if they're currently displayed
      if (isDatabaseOpen) {
        fetchAllResults()
      }
    } catch (error) {
      console.error("Failed to add GDELT results:", error)
    } finally {
      setIsAddingGdeltResults(false)
    }
  }

  // 6. Fix processBatchQueries function (if you have a batch endpoint)
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
        credentials: "include", // Add this line
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
        credentials: "include",
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

  const startGdeltSearch = async () => {
    if (!gdeltQuery.trim() || selectedCountries.length === 0) return

    setIsGdeltSearching(true)
    setGdeltResults([])
    setSelectedGdeltResults([]) // Clear previous selections

    try {
      const keywords = [gdeltQuery.trim(), ...selectedKeywordTypes]

      const response = await fetch(`${BASE_URL}/gdelt-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countries: selectedCountries,
          keywords: keywords,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const urls = await response.json()
      setGdeltResults(urls)
    } catch (error) {
      console.error("Failed to perform GDELT search:", error)
    } finally {
      setIsGdeltSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startResearch()
  }

  const handleGdeltSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startGdeltSearch()
  }

  const handlePresetSelect = (presetKey: keyof typeof PRESETS) => {
    setMethodologyRules(PRESETS[presetKey])
  }

  const handleDatabaseToggle = () => {
    setIsDatabaseOpen(!isDatabaseOpen)
    if (isDriveOpen) {
      setIsDriveOpen(false)
    }
    if (!isDatabaseOpen && databaseResults.length === 0) {
      fetchAllResults()
    }
  }

  const handleDriveToggle = () => {
    setIsDriveOpen(!isDriveOpen)
    if (isDatabaseOpen) {
      setIsDatabaseOpen(false)
    }
    if (!isDriveOpen && driveFiles.length === 0) {
      fetchDriveFiles()
    }
  }

  const handleCountryChange = (countryCode: string, checked: boolean) => {
    if (checked) {
      setSelectedCountries([...selectedCountries, countryCode])
    } else {
      setSelectedCountries(selectedCountries.filter((c) => c !== countryCode))
    }
  }

  const handleKeywordTypeChange = (keywordType: string, checked: boolean) => {
    if (checked) {
      setSelectedKeywordTypes([...selectedKeywordTypes, keywordType])
    } else {
      setSelectedKeywordTypes(selectedKeywordTypes.filter((k) => k !== keywordType))
    }
  }

  const addRule = () => {
    const newId = (Math.max(...methodologyRules.map((r) => Number.parseInt(r.id)), 0) + 1).toString()
    setMethodologyRules([...methodologyRules, { id: newId, title: "", content: "" }])
  }

  const removeRule = (id: string) => {
    setMethodologyRules(methodologyRules.filter((rule) => rule.id !== id))
  }

  const updateRule = (id: string, field: "title" | "content", value: string) => {
    setMethodologyRules(methodologyRules.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)))
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

  const formatFileName = (fileName: string) => {
    // Remove file extension and decode URL encoding
    const nameWithoutExt = fileName.replace(".pdf", "")
    const decoded = decodeURIComponent(nameWithoutExt)

    // Extract meaningful parts
    const parts = decoded.split("/")
    const actualFileName = parts[parts.length - 1]

    // If there's a folder structure, show the folder name
    if (parts.length > 1 && parts[0] !== "Unknown" && parts[0] !== "not_specified") {
      return `${parts[0]}/${actualFileName}`
    }

    return actualFileName
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-black mb-2">PEIDIR Research Model</h1>
          <p className="text-gray-600 text-lg">
            Protest Event, Institutional Demand, Institutional Response (PEIDIR) Agential Research Model
          </p>
        </div>

        {/* Database and Drive Toggle Buttons */}
        <div className="mb-6 flex gap-3">
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
          <Button
            type="button"
            onClick={handleDriveToggle}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 text-gray-700 bg-transparent"
            disabled={isSearching}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            View Drive
            {isDriveOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
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
                    onClick={() => setIsManualAddPdfDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 h-8"
                  >
                    Add PDF
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClearSession}
                    disabled={isClearingSession || isLoadingDatabase}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 h-8"
                  >
                    {isClearingSession ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        Clearing...
                      </>
                    ) : (
                      "Clear All"
                    )}
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

        {/* Drive Files Section */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out mb-8 ${
            isDriveOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <Card className="border border-gray-200 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-black">Drive Files</CardTitle>
                <div className="flex items-center gap-2">
                  {driveFiles.length > 0 && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                      {driveFiles.length} files
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchDriveFiles}
                    disabled={isLoadingDrive}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {isLoadingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                {isLoadingDrive ? (
                  <div className="text-gray-500 text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading drive files...
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">No files found in drive</div>
                ) : (
                  <div>
                    {(() => {
                      // Group files by folder
                      const groupedFiles = driveFiles.reduce(
                        (groups, fileName) => {
                          const parts = fileName.split("/")
                          let folderName = "Root"

                          if (parts.length > 1 && parts[0] !== "Unknown" && parts[0] !== "not_specified") {
                            folderName = parts[0]
                          }

                          if (!groups[folderName]) {
                            groups[folderName] = []
                          }
                          groups[folderName].push(fileName)
                          return groups
                        },
                        {} as Record<string, string[]>,
                      )

                      // Sort folders, with "Root" last
                      const sortedFolders = Object.keys(groupedFiles).sort((a, b) => {
                        if (a === "Root") return 1
                        if (b === "Root") return -1
                        return a.localeCompare(b)
                      })

                      return sortedFolders.map((folderName, folderIndex) => (
                        <div key={folderName}>
                          {/* Folder Header */}
                          {folderName !== "Root" && (
                            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 sticky top-0 z-10">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-gray-600" />
                                <span className="font-medium text-gray-800">{folderName}</span>
                                <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                                  {groupedFiles[folderName].length} files
                                </Badge>
                              </div>
                            </div>
                          )}

                          {/* Files in folder */}
                          <div className={folderName !== "Root" ? "bg-gray-50/50" : ""}>
                            {groupedFiles[folderName].map((fileName, fileIndex) => (
                              <div
                                key={fileName}
                                className={`p-4 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0 ${
                                  folderName !== "Root" ? "pl-8" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-red-500" />
                                      <h3 className="font-medium text-black leading-tight">
                                        {(() => {
                                          const nameWithoutExt = fileName.replace(".pdf", "")
                                          const decoded = decodeURIComponent(nameWithoutExt)
                                          const parts = decoded.split("/")
                                          return parts[parts.length - 1]
                                        })()}
                                      </h3>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1 ml-6">{fileName}</div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openPdf(fileName)}
                                    className="flex-shrink-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF Viewer Dialog */}
        <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-semibold text-black">PDF Viewer</DialogTitle>
                  <DialogDescription className="text-gray-600">{formatFileName(currentPdfName)}</DialogDescription>
                </div>
                <Button
                  onClick={downloadPdf}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50 text-gray-700 bg-transparent"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </DialogHeader>
            <div className="overflow-auto max-h-[75vh]">
              {currentPdfUrl && (
                <iframe
                  src={currentPdfUrl}
                  className="w-full h-[70vh] border border-gray-200 rounded-md"
                  title="PDF Viewer"
                />
              )}
            </div>
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setIsPdfDialogOpen(false)}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Manual PDF Upload Dialog */}
        <Dialog open={isManualAddPdfDialogOpen} onOpenChange={setIsManualAddPdfDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-black">Upload PDF</DialogTitle>
              <DialogDescription className="text-gray-600">
                Select a PDF file to upload and add to the database
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="pdf-upload"
                  disabled={isUploadingPdf}
                />
                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {selectedPdfFile ? selectedPdfFile.name : "Click to select PDF file"}
                  </span>
                  <span className="text-xs text-gray-400">PDF files only</span>
                </label>
              </div>

              {pdfUploadResult && (
                <div
                  className={`p-3 rounded-md text-sm ${
                    pdfUploadResult.message.includes("Error")
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-green-50 text-green-700 border border-green-200"
                  }`}
                >
                  <div className="font-medium mb-1">{pdfUploadResult.message}</div>
                  {pdfUploadResult.result && (
                    <div className="text-xs space-y-1">
                      <div>
                        <strong>Title:</strong> {pdfUploadResult.result.title || "N/A"}
                      </div>
                      <div>
                        <strong>Snippet:</strong> {pdfUploadResult.result.snippet || "N/A"}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setIsManualAddPdfDialogOpen(false)
                    setSelectedPdfFile(null)
                    setPdfUploadResult(null)
                  }}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50 text-gray-700"
                  disabled={isUploadingPdf}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addManualPdf}
                  disabled={isUploadingPdf || !selectedPdfFile}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isUploadingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    "Upload PDF"
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
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-medium text-black">AI Search</h2>
          </div>

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
                        className="text-xs border-gray-300 hover:bg-gray-50 text-gray-700 h-auto px-2 py-1 bg-transparent"
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
                            onChange={(e) => updateRule(rule.id, "title", e.target.value)}
                            className="text-sm border-gray-300 focus:border-gray-400 focus:ring-0 rounded-md"
                            disabled={isSearching}
                          />
                          <Textarea
                            placeholder="Rule content..."
                            value={rule.content}
                            onChange={(e) => updateRule(rule.id, "content", e.target.value)}
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

        {/* GDELT Search Form */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-medium text-black">GDELT Search</h2>
          </div>

          <Card className="border border-gray-200 shadow-none">
            <CardContent className="p-4">
              <form onSubmit={handleGdeltSubmit} className="space-y-4">
                {/* Search Input */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Search Term</label>
                  <Input
                    type="text"
                    placeholder="Enter search term (e.g., quebrada blanca)..."
                    value={gdeltQuery}
                    onChange={(e) => setGdeltQuery(e.target.value)}
                    className="h-11 text-base border-gray-300 focus:border-gray-400 focus:ring-0 rounded-md"
                    disabled={isGdeltSearching}
                  />
                </div>

                {/* Countries Checkboxes */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Countries</label>
                  <div className="flex gap-4">
                    {COUNTRIES.map((country) => (
                      <div key={country.code} className="flex items-center space-x-2">
                        <Checkbox
                          id={country.code}
                          checked={selectedCountries.includes(country.code)}
                          onCheckedChange={(checked) => handleCountryChange(country.code, checked as boolean)}
                          disabled={isGdeltSearching}
                        />
                        <label htmlFor={country.code} className="text-sm text-gray-700 cursor-pointer select-none">
                          {country.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keyword Types Checkboxes */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Additional Keywords</label>
                  <div className="flex gap-4">
                    {KEYWORD_TYPES.map((keywordType) => (
                      <div key={keywordType} className="flex items-center space-x-2">
                        <Checkbox
                          id={keywordType}
                          checked={selectedKeywordTypes.includes(keywordType)}
                          onCheckedChange={(checked) => handleKeywordTypeChange(keywordType, checked as boolean)}
                          disabled={isGdeltSearching}
                        />
                        <label
                          htmlFor={keywordType}
                          className="text-sm text-gray-700 cursor-pointer select-none capitalize"
                        >
                          {keywordType}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!gdeltQuery.trim() || selectedCountries.length === 0 || isGdeltSearching}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isGdeltSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 mr-2" />
                        Search GDELT
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* GDELT Results */}
          {gdeltResults.length > 0 && (
            <Card className="border border-gray-200 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium text-black">GDELT Results</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {gdeltResults.length} URLs found
                    </Badge>
                    {selectedGdeltResults.length > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {selectedGdeltResults.length} selected
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {gdeltResults.map((url, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            id={`gdelt-${index}`}
                            checked={selectedGdeltResults.includes(url)}
                            onCheckedChange={(checked) => handleGdeltResultSelection(url, checked as boolean)}
                            disabled={isAddingGdeltResults}
                          />
                          <div className="flex-1">
                            <div className="text-sm text-gray-600 truncate">{url}</div>
                            <div className="text-xs text-gray-400 mt-1">{url ? new URL(url).hostname : "Unknown"}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="flex-shrink-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          >
                            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {selectedGdeltResults.length} of {gdeltResults.length} URLs selected
                    </div>
                    <Button
                      onClick={addSelectedGdeltResults}
                      disabled={selectedGdeltResults.length === 0 || isAddingGdeltResults}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isAddingGdeltResults ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Adding to Database...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4 mr-2" />
                          Add to Database ({selectedGdeltResults.length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
