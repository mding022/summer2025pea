"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
  Calendar,
  GripVertical,
  ArrowUp,
  ArrowDown,
  BarChart3,
  HelpCircle,
  MessageSquare,
  Sun,
  Moon,
} from "lucide-react"

// Import necessary charting components
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

// Import shepherd.js
import Shepherd from "shepherd.js"
import "shepherd.js/dist/css/shepherd.css"

// Import custom range slider
import { Slider } from "@/components/ui/slider"

export const runtime = "edge"

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

interface VolumeDataPoint {
  date: string
  value: number
}

interface VolumeResponse {
  query_details: {
    title: string
    date_resolution: string
  }
  timeline: Array<{
    series: string
    data: VolumeDataPoint[]
  }>
}

interface Rule {
  id: string
  title: string
  content: string
  description?: string // Added description field for XML conversion
}

interface SimulatedExampleResult {
  id: string
  url: string
  title: string
  snippet: string
}

interface DataParam {
  id: string
  name: string
  description: string
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

const DEFAULT_DATA_PARAMS = `company: the name of the company identified in the report
date: news report date, in format (YYYY/MM/DD)
country: the country where the protest occurred
admin1: first-level administrative division (e.g., state, province) where the protest occurred
admin2: second-level administrative division (e.g., county, district) where the protest occurred
municipality: municipality where the protest occurred
start_date: start date of the protest (YYYY/MM/DD), or -999 if unknown
end_date: end date of the protest (YYYY/MM/DD), or -999 if unknown
type: 1 = march/demonstration, 2 = employees' strike, 3 = roadblock, 4 = occupation of offices/property, 5 = assembly/meeting/plenary, 6 = presentation of letter/document/press release, 7 = complaint to regulatory authorities/courts, -999 = unknown
type_change: 0 = no change; if changed, use same codes as "type"
actor1: 1 = neighborhood group, 2 = farmers/agricultural org, 3 = small businesses/business org, 4 = indigenous org, 5 = environmental org, 6 = human rights org, 7 = state employees, 8 = union, 9 = students, 10 = religious org, 12 = political party, 11 = other
actor2: same codes as actor1, or -999 if none
actor3: same codes as actor1, or -999 if none
multi_sector: 1 = coalition or >3 organizations, 0 = only 1–2 organizations
capital_city_orgs: number of capital city–based civil society organizations involved (0 if none)
intl_orgs: number of internationally based civil society organizations involved (0 if none)
church_support: 1 if a church supported protesters, 0 if not
municipal_support: 1 if municipal authorities supported protesters, 0 if not
org_names: names of civil society organizations involved, or -999 if none
target1: 1 = company, 2 = municipal gov, 3 = regional/provincial gov, 4 = central/federal gov, 5 = regulatory agencies, 6 = judiciary/courts, 7 = police/military, 8 = foreign gov, 9 = other
target2: same codes as target1, or -999 if none
target3: same codes as target1, or -999 if none
target_names: names of targeted organizations/institutions
issue1: 1 = economic/jobs, 2 = agricultural livelihoods, 3 = environment, 4 = public services, 5 = justice/legal system, 6 = aboriginal rights, 7 = corruption, 9 = access to info on mining project, 8 = other
issue2: same codes as issue1, or -999 if none
issue3: same codes as issue1, or -999 if none
issues_list: list of all issues mentioned as important to protesters in the report
participants: 1 = <10, 2 = 10–100, 3 = 101–1,000, 4 = 1,001–10,000, 5 = 10,001–100,000, 6 = >100,000, -999 = unknown
hurt: number of people hurt (0 if none mentioned)
arrested: number of people arrested (0 if none mentioned)
property_damage: 0 = none, 1 = minor, 2 = moderate, 3 = major
protest_end: 1 = dispersed/unknown, 2 = peacefully broken up, 3 = violently broken up, 4 = agreement to negotiate later, 5 = concessions offered
violence_against: 0 = none, 1 = private security, 2 = police, 3 = military, 4 = opposing political group/gang, 5 = paramilitary
women_led: 1 = led by women's organizations, 0 = not led by them, -999 = unknown`

const parseDataParams = (text: string): DataParam[] => {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line, index) => {
      const colonIndex = line.indexOf(":")
      if (colonIndex === -1) {
        return {
          id: `param-${index}`,
          name: line.trim(),
          description: "",
        }
      }
      return {
        id: `param-${index}`,
        name: line.substring(0, colonIndex).trim(),
        description: line.substring(colonIndex + 1).trim(),
      }
    })
}

const dataParamsToText = (params: DataParam[]): string => {
  return params.map((param) => `${param.name}: ${param.description}`).join("\n")
}

const PRESET_CATEGORIES = ["Protest Events", "Institutional Demands", "Institutional Responses"]

const PUBLIC_PRESET_CATEGORIES = ["Protest", "Conflict", "War"]

const PRESETS = {
  preset1: [
    // Renamed to environmental_safety for clarity
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
  ],
}

const PUBLIC_PRESETS = {
  protest: [
    {
      id: "1",
      title: "Methodology",
      content:
        "Search for protest events and demonstrations. Focus on public gatherings, marches, strikes, and other forms of collective action where groups express dissent or make demands on authorities.",
    },
    {
      id: "2",
      title: "Event Types",
      content:
        "Include peaceful protests, demonstrations, sit-ins, marches, rallies, strikes, boycotts, and civil disobedience actions. Document the scale, participants, and demands of each event.",
    },
    {
      id: "3",
      title: "Key Information",
      content:
        "Focus on: date and location, number of participants, organizing groups, stated demands or grievances, government or institutional response, and outcomes or resolutions.",
    },
    {
      id: "4",
      title: "Sources",
      content:
        "Prioritize news agencies, social media reports, NGO documentation, and official statements from organizing groups or government authorities.",
    },
  ],
  conflict: [
    {
      id: "1",
      title: "Methodology",
      content:
        "Search for conflicts including armed confrontations, territorial disputes, ethnic tensions, and violent clashes between groups, organizations, or nations.",
    },
    {
      id: "2",
      title: "Conflict Categories",
      content:
        "Include interstate conflicts, civil wars, insurgencies, territorial disputes, ethnic or religious conflicts, and resource-based conflicts. Document the parties involved and their motivations.",
    },
    {
      id: "3",
      title: "Key Information",
      content:
        "Focus on: conflict timeline and escalation patterns, parties involved and their objectives, casualties and humanitarian impact, international involvement or mediation efforts, peace negotiations or ceasefires.",
    },
    {
      id: "4",
      title: "Sources",
      content:
        "Prioritize international news agencies, conflict monitoring organizations (ACLED, UCDP), humanitarian organizations, government statements, and verified field reports.",
    },
  ],
  war: [
    {
      id: "1",
      title: "Methodology",
      content:
        "Search for military conflicts, warfare, and large-scale armed confrontations between nations or organized military forces. Include both conventional and unconventional warfare.",
    },
    {
      id: "2",
      title: "Warfare Types",
      content:
        "Include conventional warfare, guerrilla warfare, cyber warfare, proxy wars, civil wars with military involvement, and peacekeeping operations. Document military strategies and operations.",
    },
    {
      id: "3",
      title: "Key Information",
      content:
        "Focus on: military operations and battles, troop movements and deployments, weaponry and military technology used, civilian casualties and war crimes, international laws and conventions, post-war reconstruction and peace agreements.",
    },
    {
      id: "4",
      title: "Sources",
      content:
        "Prioritize military reports, international organizations (UN, ICRC), defense ministries, investigative journalism, war correspondents, and verified satellite imagery analysis.",
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
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  const [query, setQuery] = useState("")
  const [baseUrl, setBaseUrl] = useState("https://s25api.millerding.com")
  const [methodologyRules, setMethodologyRules] = useState<Rule[]>(DEFAULT_METHODOLOGY_RULES)
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false)
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false)
  const [isDriveOpen, setIsDriveOpen] = useState(false)
  const [isVolumeOpen, setIsVolumeOpen] = useState(false)
  const [volumeQuery, setVolumeQuery] = useState("")
  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([])
  const [volumeQueryTitle, setVolumeQueryTitle] = useState("")
  const [isLoadingVolume, setIsLoadingVolume] = useState(false)

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

  const [gdeltQuery, setGdeltQuery] = useState("")
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedKeywordTypes, setSelectedKeywordTypes] = useState<string[]>([])
  const [gdeltResults, setGdeltResults] = useState<string[]>([])
  const [isGdeltSearching, setIsGdeltSearching] = useState(false)
  const [selectedGdeltResults, setSelectedGdeltResults] = useState<string[]>([])
  const [isAddingGdeltResults, setIsAddingGdeltResults] = useState(false)

  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState("")
  const [currentPdfName, setCurrentPdfName] = useState("")

  const [selectedPreset, setSelectedPreset] = useState<keyof typeof PRESETS | null>(null)

  const [useGdelt, setUseGdelt] = useState(false)

  const [isSimulatedDataDialogOpen, setIsSimulatedDataDialogOpen] = useState(false)

  const [timePeriod, setTimePeriod] = useState<[number, number]>([2002, 2025]) // Use this state for time range

  const [simulatedQuery, setSimulatedQuery] = useState("pascua lama")
  const [simulatedExamples, setSimulatedExamples] = useState<SimulatedExampleResult[]>([])
  const [simulatedUrlInput, setSimulatedUrlInput] = useState("")
  const [isLoadingSimulatedExample, setIsLoadingSimulatedExample] = useState(false)

  const [dataParams, setDataParams] = useState<DataParam[]>(() => parseDataParams(DEFAULT_DATA_PARAMS))
  const [isDataParamsDialogOpen, setIsDataParamsDialogOpen] = useState(false)

  const [mode, setMode] = useState<"public" | "private">("private")
  const [showResultsPanel, setShowResultsPanel] = useState(true) // Added state to control panel visibility
  const [showLogsPanel, setShowLogsPanel] = useState(true) // Added state to control panel visibility

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

  useEffect(() => {
    // Import shepherd.js CSS in useEffect to avoid SSR issues
    const style = document.createElement("style")
    style.textContent = `
      .shepherd-modal-overlay-container {
        z-index: 9998 !important;
      }
      .shepherd-element {
        z-index: 9999 !important;
        max-width: 400px;
      }
      .shepherd-content {
        background: hsl(var(--card)) !important;
        border: 1px solid hsl(var(--border)) !important;
        border-radius: 8px !important;
        color: hsl(var(--foreground)) !important;
      }
      .shepherd-header {
        background: hsl(var(--secondary)) !important;
        padding: 16px !important;
        border-bottom: 1px solid hsl(var(--border)) !important;
      }
      .shepherd-title {
        color: hsl(var(--foreground)) !important;
        font-weight: 600 !important;
        font-size: 16px !important;
      }
      .shepherd-text {
        padding: 16px !important;
        color: hsl(var(--muted-foreground)) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
      }
      .shepherd-footer {
        padding: 12px 16px !important;
        border-top: 1px solid hsl(var(--border)) !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      .shepherd-button {
        background: hsl(var(--primary)) !important;
        color: hsl(var(--primary-foreground)) !important;
        border: none !important;
        padding: 8px 16px !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        cursor: pointer !important;
        transition: opacity 0.2s !important;
      }
      .shepherd-button:hover {
        opacity: 0.9 !important;
      }
      .shepherd-button-secondary {
        background: transparent !important;
        color: hsl(var(--muted-foreground)) !important;
        border: 1px solid hsl(var(--border)) !important;
      }
      .shepherd-cancel-icon {
        color: hsl(var(--muted-foreground)) !important;
      }
      .shepherd-arrow:before {
        background: hsl(var(--card)) !important;
        border: 1px solid hsl(var(--border)) !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.add("dark")
  }, [])

  const startTour = () => {
    setIsDatabaseOpen(true)

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: "shadow-lg",
        scrollTo: { behavior: "smooth", block: "center" },
        cancelIcon: {
          enabled: true,
        },
      },
    })

    tour.addStep({
      id: "search-bar",
      title: "AI-Powered Research Search",
      text: "Enter your research queries here. Our AI will search and analyze relevant content from across the web, helping you find the information you need quickly.",
      attachTo: {
        element: "[data-tour='search-input']",
        on: "bottom",
      },
      buttons: [
        {
          text: "Next",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "methodology",
      title: "Methodology Configuration",
      text: "Click here to configure your research methodology. Define custom rules, select presets, and set time periods to refine your search parameters.",
      attachTo: {
        element: "[data-tour='methodology-button']",
        on: "bottom",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
          classes: "shepherd-button-secondary",
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "database",
      title: "Database Management",
      text: "Access your database of collected research results here. View, manage, and organize all the sources you've gathered during your research sessions.",
      attachTo: {
        element: "[data-tour='database-toggle']",
        on: "bottom",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
          classes: "shepherd-button-secondary",
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "add-url",
      title: "Add Manual URL",
      text: "Manually add specific URLs to your database. Perfect for including sources you've found outside of automated searches.",
      attachTo: {
        element: "[data-tour='add-url-button']",
        on: "left",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
          classes: "shepherd-button-secondary",
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "add-pdf",
      title: "Upload PDF Documents",
      text: "Upload PDF files directly to your database. The system will extract and analyze the content for your research.",
      attachTo: {
        element: "[data-tour='add-pdf-button']",
        on: "left",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
          classes: "shepherd-button-secondary",
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "clear-database",
      title: "Clear Database",
      text: "Remove all results from your current database session. Use this to start fresh with a new research project.",
      attachTo: {
        element: "[data-tour='clear-button']",
        on: "left",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
          classes: "shepherd-button-secondary",
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "process",
      title: "Process Database",
      text: "Process all collected sources through AI analysis. Configure data parameters and generate structured CSV outputs with extracted insights.",
      attachTo: {
        element: "[data-tour='process-button']",
        on: "left",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
          classes: "shepherd-button-secondary",
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    })

    tour.addStep({
      id: "drive-files",
      title: "Drive Files Browser",
      text: "Access and view PDF files stored in your Google Drive. Browse your document collection organized by folder structure.",
      attachTo: {
        element: "[data-tour='drive-toggle']",
        on: "bottom",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
          classes: "shepherd-button-secondary",
        },
        {
          text: "Finish",
          action: tour.complete,
        },
      ],
    })

    tour.start()
  }

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
          current += '"'
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

  const convertRulesToXML = (rules: Rule[], timePeriod: [number, number]) => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<methodology>\n'
    rules.forEach((rule) => {
      xml += `  <rule id="${rule.id}">\n`
      xml += `    <description>${rule.description}</description>\n` // Use description if available, otherwise fallback to title
      xml += `    <content>${rule.content}</content>\n`
      xml += `  </rule>\n`
    })

    // Add time period rule
    xml += `  <rule id="time_period">\n`
    xml += `    <description>Global Time Period Filter</description>\n`
    xml += `    <content>The time period to search in is between ${timePeriod[0]} and ${timePeriod[1]}.</content>\n`
    xml += `  </rule>\n`

    xml += "</methodology>"
    return xml
  }

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

  const openPdf = (fileName: string) => {
    const pdfUrl = `${BASE_URL}/pdf?name=${encodeURIComponent(fileName)}`
    setCurrentPdfUrl(pdfUrl)
    setCurrentPdfName(fileName)
    setIsPdfDialogOpen(true)
  }

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

  const fetchAllResults = async () => {
    setIsLoadingDatabase(true)
    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/all-search-results`, {
        credentials: "include",
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

  const removeResult = async (resultId: number) => {
    try {
      const baseUrl = BASE_URL
      const response = await fetch(`${baseUrl}/remove/${resultId}`, {
        method: "DELETE",
        credentials: "include",
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
      console.log(`Cleared ${result.deleted_count} results from session ${result.session_id}`)
    } catch (error) {
      console.error("Failed to clear session results:", error)
    } finally {
      setIsClearingSession(false)
    }
  }

  const processDatabase = async () => {
    setIsDataParamsDialogOpen(true)
  }

  const processWithDataParams = async () => {
    setIsProcessing(true)
    try {
      const baseUrl = BASE_URL
      const dataParamsText = dataParamsToText(dataParams)

      const response = await fetch(`${baseUrl}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          data_params: dataParamsText,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setHasProcessed(true)
      setIsDataParamsDialogOpen(false)
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
      const response = await fetch(`${baseUrl}/resultscsv`, {
        credentials: "include",
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
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setManualAddResult(data)
      setManualUrl("")

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

      setSelectedGdeltResults([])

      if (isDatabaseOpen) {
        fetchAllResults()
      }
    } catch (error) {
      console.error("Failed to add GDELT results:", error)
    } finally {
      setIsAddingGdeltResults(false)
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
      const methodologyXML = convertRulesToXML(methodologyRules, timePeriod)

      const response = await fetch(`${baseUrl}/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: queries,
          methodology: methodologyXML,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log("Batch queries processed successfully")
      setIsBatchDialogOpen(false)
      setBatchQueries("")
      if (isDatabaseOpen) {
        fetchAllResults()
      }
    } catch (error) {
      console.error("Failed to process batch queries:", error)
    } finally {
      setIsBatchProcessing(false)
    }
  }

  // Build simulated conversation JSON
  const convertSimulatedToJson = () => {
    const exampleResultsJson = simulatedExamples.map((ex) => ({
      url: ex.url,
      title: ex.title,
      snippet: ex.snippet,
    }))

    return {
      history: [
        {
          role: "model",
          parts: [
            "Understood. Before proceeding, please provide the example expected results for the sample query. I will use those results not only to learn the correct final JSON output format, but also to understand the *type, nature, and relevance criteria* of the information I am expected to return, after my tool calls and search.",
          ],
        },
        {
          role: "user",
          parts: [
            `Here is the expected results template for ${simulatedQuery}. This is a demonstration of the final JSON output structure *and* the type of results you should target using the methodology:\n\n${JSON.stringify(exampleResultsJson, null, 2)}`,
          ],
        },
        {
          role: "model",
          parts: [
            "Thank you. I now fully understand:\n\n- the **format** of the final JSON output,\n- the **type of articles and sources** that match your methodology,\n- and the **breadth and diversity** of results to gather before saturation,\n\nWhen you provide a real query, I will:\n1. Call the <gdelt> tool first.\n2. Use time intervals to guide targeted searches.\n3. Perform *multiple iterative* <search> calls with refined operators.\n4. Continue until result saturation is reached.\n5. Return results consistent with the style and relevance demonstrated in your example.\n\nI am ready for your real query.",
          ],
        },
      ],
    }
  }

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setLogs([])
    setSearchResults([])
    setShowResultsPanel(true) // Ensure results panel is shown
    setShowLogsPanel(true) // Ensure logs panel is shown
    abortControllerRef.current = new AbortController()

    try {
      const methodologyXML = convertRulesToXML(methodologyRules, timePeriod)
      const simulatedData = convertSimulatedToJson()

      const gdeltParam = useGdelt ? "yes" : "no"
      const response = await fetch(`${BASE_URL}/stream?gdelt=${gdeltParam}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          methodology: methodologyXML,
          simulated: simulatedData, // Add simulated conversation data
        }),
        signal: abortControllerRef.current.signal,
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
    setSelectedGdeltResults([])

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
    handleSearch() // Call the renamed handleSearch function
  }

  const handleGdeltSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startGdeltSearch()
  }

  const handlePresetSelect = (presetKey: string) => {
    if (mode === "private") {
      setMethodologyRules(PRESETS[presetKey as keyof typeof PRESETS])
    } else {
      setMethodologyRules(PUBLIC_PRESETS[presetKey as keyof typeof PUBLIC_PRESETS])
    }
    setSelectedPreset(presetKey)
    setSimulatedQuery("pascua lama")
    setSimulatedExamples([])
  }

  const handleModeToggle = (newMode: "public" | "private") => {
    setMode(newMode)
    setSelectedPreset(null)
    // Reset methodology rules to default when switching mode
    setMethodologyRules(newMode === "private" ? DEFAULT_METHODOLOGY_RULES : PUBLIC_PRESETS["protest"]) // Default to protest for public mode
    // Reset simulated data when switching modes
    setSimulatedQuery("pascua lama")
    setSimulatedExamples([])
  }

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const handleDatabaseToggle = () => {
    setIsDatabaseOpen(!isDatabaseOpen)
    if (isDriveOpen) {
      setIsDriveOpen(false)
    }
    if (isVolumeOpen) {
      setIsVolumeOpen(false)
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
    if (isVolumeOpen) {
      setIsVolumeOpen(false)
    }
    if (!isDriveOpen && driveFiles.length === 0) {
      fetchDriveFiles()
    }
  }

  const handleVolumeToggle = () => {
    setIsVolumeOpen(!isVolumeOpen)
    if (isDatabaseOpen) {
      setIsDatabaseOpen(false)
    }
    if (isDriveOpen) {
      setIsDriveOpen(false)
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
    if (mode === "private") {
      setMethodologyRules(DEFAULT_METHODOLOGY_RULES) // Use default rules for private mode
    } else {
      setMethodologyRules(PUBLIC_PRESETS["protest"]) // Default to protest for public mode
    }
    setTimePeriod([2002, 2025])
    setSelectedPreset(null)
    setSimulatedQuery("pascua lama")
    setSimulatedExamples([])
    setUseGdelt(false) // Reset GDELT toggle
  }

  const moveParamUp = (index: number) => {
    if (index === 0) return
    const newParams = [...dataParams]
      ;[newParams[index - 1], newParams[index]] = [newParams[index], newParams[index - 1]]
    setDataParams(newParams)
  }

  const moveParamDown = (index: number) => {
    if (index === dataParams.length - 1) return
    const newParams = [...dataParams]
      ;[newParams[index], newParams[index + 1]] = [newParams[index + 1], newParams[index]]
    setDataParams(newParams)
  }

  const deleteParam = (id: string) => {
    setDataParams(dataParams.filter((param) => param.id !== id))
  }

  const updateParam = (id: string, field: "name" | "description", value: string) => {
    setDataParams(dataParams.map((param) => (param.id === id ? { ...param, [field]: value } : param)))
  }

  const addParam = () => {
    const newId = `param-${Date.now()}`
    setDataParams([...dataParams, { id: newId, name: "", description: "" }])
  }

  const resetDataParams = () => {
    setDataParams(parseDataParams(DEFAULT_DATA_PARAMS))
  }

  const fetchVolumeData = async () => {
    if (!volumeQuery.trim()) return

    setIsLoadingVolume(true)
    try {
      const apiUrl = `https://api.gdeltproject.org/api/v2/doc/doc?format=json&timespan=FULL&query=${encodeURIComponent(volumeQuery.trim())}&mode=timelinevol&timezoom=yes`

      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: VolumeResponse = await response.json()

      if (data.timeline && data.timeline.length > 0) {
        setVolumeData(data.timeline[0].data)
        setVolumeQueryTitle(data.query_details.title)
      }
    } catch (error) {
      console.error("Failed to fetch volume data:", error)
      setVolumeData([])
    } finally {
      setIsLoadingVolume(false)
    }
  }

  const handleVolumeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchVolumeData()
  }

  const formatVolumeDate = (dateStr: string) => {
    try {
      const year = dateStr.substring(0, 4)
      const month = dateStr.substring(4, 6)
      const day = dateStr.substring(6, 8)
      return `${year}-${month}-${day}`
    } catch {
      return dateStr
    }
  }

  const chartData = volumeData.map((point) => ({
    date: formatVolumeDate(point.date),
    value: point.value,
  }))

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
    const nameWithoutExt = fileName.replace(".pdf", "")
    const decoded = decodeURIComponent(nameWithoutExt)

    const parts = decoded.split("/")
    const actualFileName = parts[parts.length - 1]

    if (parts.length > 1 && parts[0] !== "Unknown" && parts[0] !== "not_specified") {
      return `${parts[0]}/${actualFileName}`
    }

    return actualFileName
  }

  const handleAddSimulatedExample = async () => {
    if (!simulatedUrlInput.trim()) return

    setIsLoadingSimulatedExample(true)
    try {
      const response = await fetch(
        `https://s25api.millerding.com/preview?url=${encodeURIComponent(simulatedUrlInput.trim())}`,
      )
      const data = await response.json()

      const newExample: SimulatedExampleResult = {
        id: Date.now().toString(),
        url: simulatedUrlInput.trim(),
        title: data.title || "Untitled",
        snippet: data.snippet || "No snippet available",
      }

      setSimulatedExamples([...simulatedExamples, newExample])
      setSimulatedUrlInput("")
    } catch (error) {
      console.error("Error fetching example preview:", error)
    } finally {
      setIsLoadingSimulatedExample(false)
    }
  }

  const handleRemoveSimulatedExample = (id: string) => {
    setSimulatedExamples(simulatedExamples.filter((ex) => ex.id !== id))
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Search className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">PEIDIR Research Platform</h1>
                  <p className="text-xs text-muted-foreground">Agential Research & Data Analysis and Extraction</p>
                </div>
              </div>
              <Button
                onClick={startTour}
                variant="outline"
                size="sm"
                className="border-border hover:bg-secondary text-muted-foreground hover:text-foreground bg-transparent ml-4"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Tour
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={toggleTheme}
                variant="outline"
                size="sm"
                className="border-border hover:bg-secondary text-muted-foreground hover:text-foreground bg-transparent"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleModeToggle("public")}
                  className={`text-xs h-7 px-3 transition-all ${mode === "public"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Public
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleModeToggle("private")}
                  className={`text-xs h-7 px-3 transition-all ${mode === "private"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Private
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-6 py-8 max-w-[1600px]">
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            type="button"
            onClick={handleDatabaseToggle}
            variant="outline"
            className={`h-auto py-3 px-4 flex items-center justify-between border-border hover:bg-secondary text-foreground transition-all ${isDatabaseOpen ? "bg-secondary border-primary" : "bg-card"
              }`}
            disabled={isSearching}
            data-tour="database-toggle"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                <Database className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Database</div>
                <div className="text-xs text-muted-foreground">{databaseResults.length} results</div>
              </div>
            </div>
            {isDatabaseOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          <Button
            type="button"
            onClick={handleDriveToggle}
            variant="outline"
            className={`h-auto py-3 px-4 flex items-center justify-between border-border hover:bg-secondary text-foreground transition-all ${isDriveOpen ? "bg-secondary border-primary" : "bg-card"
              }`}
            disabled={isSearching}
            data-tour="drive-toggle"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Drive Files</div>
                <div className="text-xs text-muted-foreground">{driveFiles.length} files</div>
              </div>
            </div>
            {isDriveOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          <Button
            type="button"
            onClick={handleVolumeToggle}
            variant="outline"
            className={`h-auto py-3 px-4 flex items-center justify-between border-border hover:bg-secondary text-foreground transition-all ${isVolumeOpen ? "bg-secondary border-primary" : "bg-card"
              }`}
            disabled={isSearching}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Volume Analysis</div>
                <div className="text-xs text-muted-foreground">GDELT insights</div>
              </div>
            </div>
            {isVolumeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out mb-6 ${isDatabaseOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base font-semibold text-foreground">Database Results</CardTitle>
                  {databaseResults.length > 0 && (
                    <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0">
                      {databaseResults.length} results
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={processDatabase}
                    disabled={isProcessing || isLoadingDatabase}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    data-tour="process-button"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Processing
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
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isLoadingCSV ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          Loading
                        </>
                      ) : (
                        <>
                          <FileText className="w-3 h-3 mr-1" />
                          View Data
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => setIsManualAddDialogOpen(true)}
                    size="sm"
                    variant="outline"
                    className="border-border hover:bg-secondary text-foreground"
                    data-tour="add-url-button"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add URL
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsManualAddPdfDialogOpen(true)}
                    size="sm"
                    variant="outline"
                    className="border-border hover:bg-secondary text-foreground"
                    data-tour="add-pdf-button"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add PDF
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClearSession}
                    disabled={isClearingSession || isLoadingDatabase}
                    size="sm"
                    variant="outline"
                    className="border-destructive/50 hover:bg-destructive/10 text-destructive bg-transparent"
                    data-tour="clear-button"
                  >
                    {isClearingSession ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Clearing
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear All
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchAllResults}
                    disabled={isLoadingDatabase}
                    className="text-muted-foreground hover:text-foreground hover:bg-secondary"
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
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {isLoadingDatabase ? (
                  <div className="text-muted-foreground text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading database results...</p>
                  </div>
                ) : databaseResults.length === 0 ? (
                  <div className="text-muted-foreground text-center py-12">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No results found in database</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {databaseResults.map((result) => (
                      <div key={result.id} className="p-4 hover:bg-secondary/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground leading-tight">{result.title}</h3>
                              <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0">
                                #{result.id}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{result.snippet}</p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="text-xs bg-secondary text-muted-foreground border-0"
                              >
                                {(() => {
                                  try {
                                    if (result.link && result.link.includes(".pdf")) {
                                      const fileName = result.link.split("/").pop() || result.link
                                      const cleanName = fileName.replace(".pdf", "")
                                      const parts = cleanName.split("_")
                                      if (parts.length > 0 && parts[0].includes(".")) {
                                        return `PDF: ${parts[0]}`
                                      }
                                      return "PDF File"
                                    }
                                    return new URL(result.link).hostname
                                  } catch {
                                    return result.link && result.link.includes(".pdf") ? "PDF File" : "Unknown"
                                  }
                                })()}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
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
                              onClick={() => {
                                if (result.link && result.link.includes(".pdf")) {
                                  const pdfUrl = `${BASE_URL}/pdf?name=${encodeURIComponent(result.link.replace("cache_pdfs/", ""))}`
                                  setCurrentPdfUrl(pdfUrl)
                                  setCurrentPdfName(result.link)
                                  setIsPdfDialogOpen(true)
                                } else {
                                  window.open(result.link, "_blank", "noopener,noreferrer")
                                }
                              }}
                              className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeResult(result.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out mb-6 ${isDriveOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base font-semibold text-foreground">Drive Files</CardTitle>
                  {driveFiles.length > 0 && (
                    <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0">
                      {driveFiles.length} files
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={fetchDriveFiles}
                  disabled={isLoadingDrive}
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  {isLoadingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {isLoadingDrive ? (
                  <div className="text-muted-foreground text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading drive files...</p>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="text-muted-foreground text-center py-12">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No files found in drive</p>
                  </div>
                ) : (
                  <div>
                    {(() => {
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

                      const sortedFolders = Object.keys(groupedFiles).sort((a, b) => {
                        if (a === "Root") return 1
                        if (b === "Root") return -1
                        return a.localeCompare(b)
                      })

                      return sortedFolders.map((folderName) => (
                        <div key={folderName}>
                          {folderName !== "Root" && (
                            <div className="bg-secondary/50 px-4 py-2 border-b border-border sticky top-0 z-10">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-primary" />
                                <span className="font-medium text-foreground">{folderName}</span>
                                <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                                  {groupedFiles[folderName].length} files
                                </Badge>
                              </div>
                            </div>
                          )}
                          <div className={folderName !== "Root" ? "bg-secondary/20" : ""}>
                            {groupedFiles[folderName].map((fileName) => (
                              <div
                                key={fileName}
                                className={`p-4 hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-b-0 ${folderName !== "Root" ? "pl-8" : ""
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-destructive" />
                                      <h3 className="font-medium text-foreground leading-tight text-sm">
                                        {(() => {
                                          const nameWithoutExt = fileName.replace(".pdf", "")
                                          const decoded = decodeURIComponent(nameWithoutExt)
                                          const parts = decoded.split("/")
                                          return parts[parts.length - 1]
                                        })()}
                                      </h3>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 ml-6">{fileName}</div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openPdf(fileName)}
                                    className="text-muted-foreground hover:text-foreground hover:bg-secondary"
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

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out mb-6 ${isVolumeOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold text-foreground">Volume Analysis</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Analyze search volume trends using GDELT data</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <form onSubmit={handleVolumeSubmit} className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Enter query for volume analysis..."
                  value={volumeQuery}
                  onChange={(e) => setVolumeQuery(e.target.value)}
                  className="flex-1 text-sm border-border bg-secondary focus:border-primary focus:ring-1 focus:ring-primary rounded-md text-foreground"
                  disabled={isLoadingVolume}
                />
                <Button
                  type="submit"
                  disabled={!volumeQuery.trim() || isLoadingVolume}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoadingVolume ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </form>

              {volumeData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Timeline: {volumeQueryTitle}</h3>
                    <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0">
                      {volumeData.length} data points
                    </Badge>
                  </div>

                  <div className="h-80 w-full bg-secondary/30 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          stroke="hsl(var(--border))"
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          stroke="hsl(var(--border))"
                          label={{
                            value: "Volume Intensity",
                            angle: -90,
                            position: "insideLeft",
                            style: { fill: "hsl(var(--muted-foreground))" },
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {!isLoadingVolume && volumeData.length === 0 && volumeQuery && (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No volume data found for this query</p>
                </div>
              )}

              {!volumeQuery && (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Enter a search query to analyze volume trends over time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-semibold text-foreground">PDF Viewer</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {formatFileName(currentPdfName)}
                  </DialogDescription>
                </div>
                <Button
                  onClick={downloadPdf}
                  variant="outline"
                  className="border-border hover:bg-secondary text-foreground bg-transparent"
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
                  className="w-full h-[70vh] border border-border rounded-md"
                  title="PDF Viewer"
                />
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                onClick={() => setIsPdfDialogOpen(false)}
                variant="outline"
                className="border-border hover:bg-secondary text-foreground"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">Processed Data Results</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                CSV data from the processed database results
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-auto max-h-[60vh] custom-scrollbar">
              {csvData && (
                <div className="border border-border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary border-b border-border">
                      <tr>
                        {csvData.headers.map((header, index) => (
                          <th
                            key={index}
                            className="px-3 py-2 text-left font-medium text-foreground border-r border-border last:border-r-0"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {csvData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-secondary/50">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-3 py-2 text-foreground border-r border-border last:border-r-0"
                            >
                              {cell === "-999" ? <span className="text-muted-foreground italic">N/A</span> : cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                onClick={() => setIsDialogOpen(false)}
                variant="outline"
                className="border-border hover:bg-secondary text-foreground"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isManualAddDialogOpen} onOpenChange={setIsManualAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">Add Manual URL</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enter a URL to manually add to the database
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="url"
                placeholder="https://example.com/article"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="text-sm border-border bg-secondary focus:border-primary focus:ring-1 focus:ring-primary rounded-md text-foreground"
                disabled={isAddingManualUrl}
              />

              {manualAddResult && (
                <div
                  className={`p-3 rounded-md text-sm ${manualAddResult.message.includes("Error")
                      ? "bg-destructive/10 text-destructive border border-destructive/50"
                      : "bg-green-500/10 text-green-500 border border-green-500/50"
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

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  onClick={() => {
                    setIsManualAddDialogOpen(false)
                    setManualUrl("")
                    setManualAddResult(null)
                  }}
                  variant="outline"
                  className="border-border hover:bg-secondary text-foreground"
                  disabled={isAddingManualUrl}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addManualUrl}
                  disabled={isAddingManualUrl || !manualUrl.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
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

        <Dialog open={isManualAddPdfDialogOpen} onOpenChange={setIsManualAddPdfDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">Upload PDF</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Select a PDF file to upload and add to the database
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-secondary/30">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedPdfFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="pdf-upload"
                  disabled={isUploadingPdf}
                />
                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {selectedPdfFile ? selectedPdfFile.name : "Click to select PDF file"}
                  </span>
                  <span className="text-xs text-muted-foreground">PDF files only</span>
                </label>
              </div>

              {pdfUploadResult && (
                <div
                  className={`p-3 rounded-md text-sm ${pdfUploadResult.message.includes("Error")
                      ? "bg-destructive/10 text-destructive border border-destructive/50"
                      : "bg-green-500/10 text-green-500 border border-green-500/50"
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

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  onClick={() => {
                    setIsManualAddPdfDialogOpen(false)
                    setSelectedPdfFile(null)
                    setPdfUploadResult(null)
                  }}
                  variant="outline"
                  className="border-border hover:bg-secondary text-foreground"
                  disabled={isUploadingPdf}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addManualPdf}
                  disabled={isUploadingPdf || !selectedPdfFile}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
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

        <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">Batch Search</DialogTitle>
              <DialogDescription className="text-muted-foreground">
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
                className="min-h-[200px] text-sm border-border bg-secondary focus:border-primary focus:ring-1 focus:ring-primary rounded-md resize-none text-foreground"
                disabled={isBatchProcessing}
              />
              <div className="flex justify-between items-center border-t border-border pt-4">
                <div className="text-sm text-muted-foreground">
                  {batchQueries.split("\n").filter((q) => q.trim().length > 0).length} queries
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsBatchDialogOpen(false)}
                    variant="outline"
                    className="border-border hover:bg-secondary text-foreground"
                    disabled={isBatchProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={processBatchQueries}
                    disabled={isBatchProcessing || !batchQueries.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
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

        <Dialog open={isDataParamsDialogOpen} onOpenChange={setIsDataParamsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">Configure Data Parameters</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Customize the CSV output columns and their descriptions. Drag to reorder, or use arrow buttons.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0">
                  {dataParams.length} parameters
                </Badge>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetDataParams}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Reset to default
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addParam}
                    className="text-xs border-border hover:bg-secondary text-foreground bg-transparent"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Parameter
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                {dataParams.map((param, index) => (
                  <div
                    key={param.id}
                    className="border border-border rounded-md p-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveParamUp(index)}
                          disabled={index === 0}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <GripVertical className="w-4 h-4 text-border" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveParamDown(index)}
                          disabled={index === dataParams.length - 1}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Parameter name (e.g., company, date, country)"
                          value={param.name}
                          onChange={(e) => updateParam(param.id, "name", e.target.value)}
                          className="text-sm border-border bg-secondary focus:border-primary focus:ring-1 focus:ring-primary rounded-md font-medium text-foreground"
                        />
                        <Textarea
                          placeholder="Parameter description..."
                          value={param.description}
                          onChange={(e) => updateParam(param.id, "description", e.target.value)}
                          className="min-h-[60px] text-sm border-border bg-secondary focus:border-primary focus:ring-1 focus:ring-primary rounded-md resize-none text-foreground"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteParam(param.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  onClick={() => setIsDataParamsDialogOpen(false)}
                  variant="outline"
                  className="border-border hover:bg-secondary text-foreground"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={processWithDataParams}
                  disabled={isProcessing}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Process Database"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">AI-Powered Research</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative" data-tour="search-input">
              <Input
                type="text"
                placeholder="Enter research query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 text-base border-border bg-secondary focus:border-primary focus:ring-1 focus:ring-primary rounded-md pr-12 text-foreground placeholder:text-muted-foreground"
                disabled={isSearching}
              />
              <Button
                type="button"
                onClick={() => setIsBatchDialogOpen(true)}
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
                disabled={isSearching}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button
              type="button"
              onClick={() => setIsMethodologyOpen(!isMethodologyOpen)}
              variant="outline"
              className="h-11 px-4 border-border hover:bg-secondary text-foreground rounded-md"
              disabled={isSearching}
              data-tour="methodology-button"
            >
              <Settings className="w-4 h-4 mr-2" />
              Methodology
              {isMethodologyOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </Button>
            <Button
              type="submit"
              disabled={!query.trim() || isSearching}
              className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${isMethodologyOpen ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
              }`}
          >
            <Card className="border-border bg-card shadow-lg">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Research Methodology Rules</label>
                    <div className="flex gap-2 items-center">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="use-gdelt"
                          checked={useGdelt}
                          onCheckedChange={(checked) => setUseGdelt(checked === true)}
                          className="border-border data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <label
                          htmlFor="use-gdelt"
                          className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                        >
                          Use GDELT?
                        </label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetToDefault}
                        className="text-xs text-muted-foreground hover:text-foreground h-auto p-1"
                      >
                        Reset to default
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addRule}
                        className="text-xs border-border hover:bg-secondary text-foreground h-auto px-2 py-1 bg-transparent"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Rule
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <div className="flex items-center gap-2 mr-4">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Quick presets:</span>
                    </div>
                    {mode === "private"
                      ? Object.entries(PRESETS).map(([key, value], index) => (
                        <Button
                          key={key}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePresetSelect(key)}
                          className={`text-xs border-border hover:bg-secondary text-foreground ${selectedPreset === key ? "bg-primary/20 border-primary text-primary" : ""
                            }`}
                          disabled={isSearching}
                        >
                          {PRESET_CATEGORIES[index]}
                        </Button>
                      ))
                      : Object.entries(PUBLIC_PRESETS).map(([key, value], index) => (
                        <Button
                          key={key}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePresetSelect(key)}
                          className={`text-xs border-border hover:bg-secondary text-foreground ${selectedPreset === key ? "bg-primary/20 border-primary text-primary" : ""
                            }`}
                          disabled={isSearching}
                        >
                          {PUBLIC_PRESET_CATEGORIES[index]}
                        </Button>
                      ))}
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {methodologyRules.map((rule) => (
                      <div key={rule.id} className="border border-border bg-secondary/30 rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Rule {rule.id}</span>
                          {methodologyRules.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRule(rule.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                            className="text-sm border-border bg-secondary focus:border-primary focus:ring-1 focus:ring-primary rounded-md text-foreground"
                            disabled={isSearching}
                          />
                          <Textarea
                            placeholder="Rule content..."
                            value={rule.content}
                            onChange={(e) => updateRule(rule.id, "content", e.target.value)}
                            className="min-h-[60px] text-sm border-border bg-secondary focus:border-primary focus:ring-1 focus:ring-primary rounded-md resize-none text-foreground"
                            disabled={isSearching}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-2 border-accent/30 bg-accent/5 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-foreground">Simulated Data</span>
                        <Badge variant="secondary" className="bg-accent/20 text-accent text-xs border-0">
                          Optional
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSimulatedDataDialogOpen(true)}
                        className="text-xs border-border hover:bg-secondary text-foreground h-auto px-6 py-2 bg-transparent"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Configure Simulation
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Configure example conversation data to guide the AI model with expected result formats and
                      relevance criteria.
                    </p>
                  </div>

                  <div className="border-2 border-primary/30 bg-primary/5 rounded-md p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Time Period (Global Rule)</span>
                      <Badge variant="secondary" className="bg-primary/20 text-primary text-xs border-0">
                        Required
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-foreground">
                        <span className="font-medium">{timePeriod[0]}</span>
                        <span className="text-xs text-muted-foreground">to</span>
                        <span className="font-medium">{timePeriod[1]}</span>
                      </div>
                      <Slider
                        value={timePeriod}
                        onValueChange={(value) => setTimePeriod(value as [number, number])}
                        min={2002}
                        max={2025}
                        step={1}
                        className="w-full"
                        disabled={isSearching}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>2002</span>
                        <span>2025</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        Search results will be limited to events between {timePeriod[0]} and {timePeriod[1]}.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setIsMethodologyOpen(false)}
                      variant="outline"
                      size="sm"
                      className="text-sm border-border hover:bg-secondary text-foreground"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${showLogsPanel ? "block" : "hidden"}`}>
              <div className="flex items-center gap-2 mb-4">
                <Circle
                  className={`w-2 h-2 ${isSearching ? "fill-primary text-primary animate-pulse" : "fill-muted-foreground text-muted-foreground"}`}
                />
                <h2 className="text-base font-semibold text-foreground">Live Research Log</h2>
                {isSearching && (
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">
                    Active
                  </Badge>
                )}
              </div>

              <Card className="border-border bg-card shadow-lg">
                <CardContent className="p-0">
                  <div className="bg-secondary/50 border-b border-border p-4 h-96 overflow-y-auto font-mono text-xs custom-scrollbar">
                    {logs.length === 0 ? (
                      <div className="text-muted-foreground text-center mt-32">
                        <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Enter a query and click search to begin</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {logs.map((log, i) => (
                          <div key={i} className="flex items-start gap-3 text-foreground/80">
                            <span className="flex-shrink-0 mt-0.5 text-muted-foreground">{getLogIcon(log)}</span>
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

            <div className={`${showResultsPanel ? "block" : "hidden"}`}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-semibold text-foreground">Search Results</h2>
                {searchResults.length > 0 && (
                  <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0">
                    {searchResults.length} results
                  </Badge>
                )}
              </div>

              <Card className="border-border bg-card shadow-lg">
                <CardContent className="p-0">
                  <div className="h-96 overflow-y-auto custom-scrollbar">
                    {searchResults.length === 0 ? (
                      <div className="text-muted-foreground text-center mt-32 p-6">
                        {isSearching ? (
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm">Analyzing and gathering results...</p>
                          </div>
                        ) : (
                          <>
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Results will appear here after research is complete</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {searchResults.map((result, i) => (
                          <div key={i} className="p-4 hover:bg-secondary/50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <h3 className="font-medium text-foreground leading-tight">{result.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{result.snippet}</p>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-secondary text-muted-foreground border-0"
                                  >
                                    {result.url ? new URL(result.url).hostname : "Unknown"}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="text-muted-foreground hover:text-foreground hover:bg-secondary"
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
      </main>
      <Dialog open={isSimulatedDataDialogOpen} onOpenChange={setIsSimulatedDataDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Configure Simulated Interaction Chain</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set up the AI conversation flow with system prompts, example query, and expected results.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
            {/* System Prompt - Model's first message */}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-sm font-semibold text-orange-500">System Prompts with Methodology</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-blue-500">Model Acknowledgement to System Prompts</span>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-4">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  Understood. Before proceeding, please provide the example expected results for the sample query. I
                  will use those results not only to learn the correct final JSON output format, but also to understand
                  the *type, nature, and relevance criteria* of the information I am expected to return, after my tool
                  calls and search.
                </p>
              </div>
            </div>

            {/* User Message - Editable query and examples */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-semibold text-green-500">User</span>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-md p-4 space-y-4">
                <div>
                  <p className="text-sm text-foreground/90 mb-3">
                    Here is the expected results template for{" "}
                    <Input
                      value={simulatedQuery}
                      onChange={(e) => setSimulatedQuery(e.target.value)}
                      className="inline-flex w-auto min-w-[120px] h-7 px-2 text-sm bg-background border-green-500/40"
                      placeholder="Enter query..."
                    />
                    . This is a demonstration of the final JSON output structure *and* the type of results you should
                    target using the methodology:
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Example Results</label>
                    <div className="flex gap-2">
                      <Input
                        value={simulatedUrlInput}
                        onChange={(e) => setSimulatedUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddSimulatedExample()
                          }
                        }}
                        placeholder="Enter URL to fetch preview..."
                        className="h-8 text-xs bg-background border-border w-64"
                        disabled={isLoadingSimulatedExample}
                      />
                      <Button
                        type="button"
                        onClick={handleAddSimulatedExample}
                        disabled={!simulatedUrlInput.trim() || isLoadingSimulatedExample}
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        {isLoadingSimulatedExample ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {simulatedExamples.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar bg-background/50 rounded-md p-3">
                      {simulatedExamples.map((example, index) => (
                        <div key={example.id} className="border border-border bg-card rounded-md p-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                                <p className="text-sm font-medium text-foreground truncate">{example.title}</p>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mb-1">{example.url}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{example.snippet}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSimulatedExample(example.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-background/50 rounded-md p-6 text-center">
                      <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground italic">
                        No example results added yet. Add URLs to fetch article previews.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Model Response */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-blue-500">Model</span>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-4">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {`Thank you. I now fully understand:

- the **format** of the final JSON output,
- the **type of articles and sources** that match your methodology,
- and the **breadth and diversity** of results to gather before saturation,

When you provide a real query, I will:
1. Call the <gdelt> tool first.
2. Use time intervals to guide targeted searches.
3. Perform *multiple iterative* <search> calls with refined operators.
4. Continue until result saturation is reached.
5. Return results consistent with the style and relevance demonstrated in your example.

I am ready for your real query.`}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSimulatedDataDialogOpen(false)}
              className="border-border"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
