import Markdown from "markdown-to-jsx"

const markdownContent = `# Research Model Documentation
All the documentation required to fully operate and use the research model, for the purposes of: scraping, processing and performing web research and gathering live news sources and archives, mass extracting data from various web sources, and sorting & classifying data.

### Hardware Infrastructure Used
The server is running a \`Python-Flask\` server using \`gunicorn\`, running on Ubuntu. Although most server environments should be able to run it properly, I noticed that a CPU with integrated graphics, or a dedicated graphics card is **necessary**, otherwise PDFs cannot be rendered and downloaded from the web. Servers are reverse proxied using nginx to Cloudflare Tunnels.

## Data Extraction and Compiling

Web pages (stored by their URLs), PDFs of web data, news articles, journals, academic papers, and all other forms of media are combined together and broken down into bit data, which is then fed to the AI model. The AI model (Gemini 2.0 Flash) is also provided with a system prompt, with the proper data parameters injected with every request. This is so that different data with varying data that is required to be extracted is handled properly.

Format of data parameters being extracted for \`Protest Events\`

    company: the name of the company identified in the report
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
    women_led: 1 = led by women's organizations, 0 = not led by them, -999 = unknown

Data that is extracted is normalized to a JSON array, and written to a CSV file, which can be downloaded and viewed by the user at \`/resultscsv\`.

## AI for Web Research (Google and GDELT)

The AI is provided with an interface for a SERP client written in Python. This class makes requests to the proxy service ValueSERP with custom geographical search origins and search operators, which allows the AI to interact with the web.

Additionally, the AI is also provided with an interface to search through the GDELT 2.0 database, which uses the API \`https://api.gdeltproject.org/api/v2/\` which contains data for the past 8 years of GDELT data. 

To perform research, the AI model is trained to create requests based on a custom search methodology, and to align its tool calls to both the Google web search and GDELT client to as close to the methodology as possible. The AI model is also provided with a sample snippet of a successful response for consistency and to reduce the chance of hallucination. 
### Relevance Saturation
To replace the hard limit of results that are fetched by the model, the AI also must now reach a certain level of relevance saturation in order to be satisfied with a search. 
> Relevance saturation criteria provided (Exact string code):
\\- The AI adds any article that closely matches the methodology—mentions the mine, protests, conflicts, or related events—to the collection.
\\- There is no fixed number of URLs. The collection can include just a few articles if only a few are relevant, or many dozens or even hundreds if many relevant sources exist.
\\- The search only stops when all new search results are no longer relevant or only marginally related, ensuring that irrelevant articles are not added just to reach a specific number.

The current process for all search is that it first calls the \`<gdelt>\` tool once, processing the web title and snippet data from relevant results, followed by iteratively calling the \`<search>\` tool until certain relevance saturation is reached so that it believes that it cannot find any more results that are close enough to the search methodology to be relevant.


### Search Methodology

The AI model will always be trained on the interface required to perform web search, but the content that it is looking for is based on search operators created to match the search methodology. For example, an example rule for Protest Event results in an XML format could be:

    <rule>
    <title>whitelisted domains</title>
    <content>You must first look on olca.cl</content>
    </rule>

This will force the AI model to add \`site:olca.cl\` for all search requests. 

Since the AI model is based on a feedback loop that iteratively performs searches, it will always use previous website result data (title, snippet, date), in order to create better search operations and be as efficient as possible. An example was, if it searches for \`mine name\`, but there are many identical web pages titled with \`community name\`, it may look for protests in the community instead, even if the titles are different. 

The search model is using the most recent Gemini model \`gemini-2.5-flash\` , since it has more capable reasoning and logic capabilities. Note that data extraction and compilation does not require these capabilities.

## Analyzing GDELT time series data to detect anomalies

The event detection algorithm operates on time-series data from GDELT 2.0's Doc API representing daily media coverage volumes for a given query. The underlying mathematical approach combines time-series decomposition and statistical anomaly detection to isolate significant surges in attention from normal background fluctuations (for example, quarterly earnings filings from companies). I used a STL period (stl_period) of 90 days, for each quarter (Q1,2,3,4).

### 1. Decomposition

The process begins by applying **STL (Seasonal-Trend decomposition using Loess)** to separate the observed series \( x_t \) into three additive components:

\[
x_t = T_t + S_t + R_t
\]

where:
- \( T_t \) represents the **trend** component, capturing long-term changes in media attention,
- \( S_t \) represents the **seasonal** component, capturing periodic cycles such as weekly or monthly variations,
- \( R_t \) represents the **residual** component, containing irregular fluctuations that may correspond to specific events.

The residual component \( R_t \) is the focus of anomaly detection since it represents deviations unexplained by regular trend or seasonal behavior.

### 2. Standardization and Z-Score

To quantify how unusual each residual is, the algorithm standardizes \( R_t \) using a **z-score**, defined as:

z_t = (R_t - μ_R) / σ_R

where:
- \( \mu_R \) is the mean of all residuals,
- \( \sigma_R \) is the standard deviation of the residuals.

The z-score measures how many standard deviations each day’s residual deviates from the mean. A z-score close to 0 indicates typical variation, while large positive z-scores indicate statistically significant spikes in coverage. In this implementation, days where \( z_t > 3 \) are treated as **spike days**, signaling potential real-world events.

### 3. Event Clustering

Since major events often span multiple consecutive days, spike days are grouped into **event windows**. If two spike days occur within a specified temporal gap (e.g., fewer than five days apart), they are merged into a single event cluster. For each cluster, the algorithm calculates:

- **Start and end date**
- **Peak z-score**
- **Peak intensity (raw coverage volume)**
- **Total event volume**
- **Duration (in days)**

An event’s **strength** metric is computed as a function of both its peak z-score and total volume, balancing the magnitude and persistence of the spike.

### 4. Filtering and Classification

Weak or noisy clusters—those with low peak z-scores or minimal total volume relative to the overall series—are filtered out. If too many weak clusters are found, the dataset is treated as noise and no major events are reported. The remaining clusters represent statistically significant deviations in media attention and are labeled as **major events**.

### 5. Interpretation

This method identifies time periods where observed media coverage sharply exceeds what would be expected based on historical trends and seasonal cycles. By adjusting parameters such as the STL period, z-score threshold, and clustering gap, the model can be tuned to different types of topics and noise levels. The result is a mathematically grounded and interpretable way to detect meaningful spikes in global attention.


`

export const runtime = 'edge';

export default function MarkdownViewer() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <article className="markdown-content">
          <Markdown>{markdownContent}</Markdown>
        </article>
      </div>
    </div>
  )
}
