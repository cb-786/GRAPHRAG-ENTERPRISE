<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GovIntel.AI - Enterprise GraphRAG</title>
    
    <!-- Tailwind for GitHub-like Markdown Styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Mermaid.js to render the flowcharts -->
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ startOnLoad: true, theme: 'base', themeVariables: { primaryColor: '#f8fafc', primaryTextColor: '#1e293b', primaryBorderColor: '#cbd5e1', lineColor: '#64748b' }});
    </script>

    <style>
        /* Custom styles to mimic markdown blocks */
        pre { background-color: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1.5rem; }
        code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.875rem; }
        p code, li code { background-color: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.875em; color: #db2777; }
    </style>
</head>
<body class="bg-white text-slate-800 font-sans antialiased selection:bg-indigo-100">

    <main class="max-w-4xl mx-auto px-6 py-12">
        
        <!-- Header -->
        <header class="text-center mb-12">
            <h1 class="text-4xl font-extrabold text-slate-900 mb-4 flex items-center justify-center gap-3">
                🌐 GovIntel.AI
            </h1>
            <p class="text-xl font-medium text-slate-600 mb-6">Enterprise GraphRAG & Semantic Classification Engine</p>
            
            <div class="flex flex-wrap justify-center gap-2 mb-8">
                <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI">
                <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React">
                <img src="https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white" alt="Neo4j">
                <img src="https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
                <img src="https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
                <img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white" alt="Gemini">
            </div>

            <p class="text-lg text-slate-500 italic max-w-3xl mx-auto">
                An AI-powered B2G (Business-to-Government) system that ingests unstructured business descriptions and semantically maps them to the correct National Industrial Classification (NIC) codes using a dynamically generated Knowledge Graph.
            </p>
        </header>

        <hr class="border-slate-200 mb-10">

        <!-- Interface Previews -->
        <section class="mb-12">
            <h2 class="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">📸 Interface Previews</h2>
            <div class="space-y-10 text-center">
                <div>
                    <img src="./screenshots/ss1.png" alt="GraphRAG Search Interface" class="mx-auto rounded-lg shadow-md border border-slate-200 w-full max-w-3xl" onerror="this.src='https://via.placeholder.com/800x400?text=Screenshot+1+Not+Found';">
                    <p class="text-sm text-slate-500 mt-3 italic">Fig 1. The main Semantic GraphRAG classification interface demonstrating AI synthesis and Cache Hits.</p>
                </div>
                <div>
                    <img src="./screenshots/ss2.png" alt="Data Ingestion Interface" class="mx-auto rounded-lg shadow-md border border-slate-200 w-full max-w-3xl" onerror="this.src='https://via.placeholder.com/800x400?text=Screenshot+2+Not+Found';">
                    <p class="text-sm text-slate-500 mt-3 italic">Fig 2. The Admin Data Ingestion portal for extracting graph nodes/edges from NIC CSV records.</p>
                </div>
                
            </div>
        </section>

        <!-- Secret Sauce -->
        <section class="mb-12">
            <h2 class="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">🚀 The "Secret Sauce" (Why GraphRAG?)</h2>
            <p class="mb-4">Traditional RAG (Retrieval-Augmented Generation) relies purely on vector similarity (finding text that "looks" similar in high-dimensional space). This often leads to hallucinations when dealing with highly structured, interconnected data like government industrial codes.</p>
            <p class="mb-4 font-semibold text-indigo-600">GovIntel.AI utilizes GraphRAG.</p>
            <ol class="list-decimal pl-6 space-y-2 mb-6">
                <li>We extract exact entities (<code>Sector</code>, <code>Activity</code>, <code>Product</code>, <code>RawMaterial</code>) and their relationships (<code>PRODUCES</code>, <code>USES</code>, <code>BELONGS_TO</code>).</li>
                <li>We embed the core nodes using 768-dimensional vectors.</li>
                <li>During a search, we find the closest vector anchor, but then <strong>traverse the graph radially (1-hop)</strong> to pull the exact interconnected business ecosystem.</li>
                <li>The LLM synthesizes its answer based on <em>hardcoded graph facts</em>, completely eliminating hallucinations.</li>
            </ol>
        </section>

        <!-- System Architecture & Flowcharts -->
        <section class="mb-12">
            <h2 class="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">🧠 System Architecture & Dry-Run Flowcharts</h2>
            <p class="mb-8">The system is highly optimized to protect the LLM and the Database from unnecessary load. Below are the dry-run execution flows for the two most critical API routes.</p>

            <h3 class="text-xl font-bold text-slate-800 mb-4">1. The Search & Synthesis Route (<code>GET /api/v1/search/rag</code>)</h3>
            <p class="text-sm text-slate-500 italic mb-4">This route handles user queries, caches responses to save API costs, traverses the graph, and synthesizes the final output.</p>
            
            <!-- Mermaid Sequence Diagram -->
            <div class="mermaid bg-slate-50 border border-slate-200 rounded-lg p-4 mb-10 flex justify-center">
sequenceDiagram
    participant User
    participant Nginx
    participant FastAPI as Backend (routes.py)
    participant Redis as CacheService
    participant LLM as Gemini API
    participant Neo4j as Graph Database

    User->>Nginx: GET /search/rag?q="making clothes"
    Nginx->>FastAPI: Proxy Request
    
    FastAPI->>Redis: 1. Check Cache (Key: rag_search:making clothes)
    
    alt Cache HIT ⚡
        Redis-->>FastAPI: Return Cached JSON
        FastAPI-->>User: Instant Response (<10ms)
    else Cache MISS ⏳
        Redis-->>FastAPI: Null
        FastAPI->>LLM: 2. Generate 768-dim Embedding
        LLM-->>FastAPI: Return Vector Float[]
        
        FastAPI->>Neo4j: 3. db.index.vector.queryNodes() + 1-hop Traversal
        Neo4j-->>FastAPI: Return Graph Context (Nodes & Edges)
        
        FastAPI->>LLM: 4. Prompt: Synthesize Context + User Query
        LLM-->>FastAPI: Return Structured JSON Explanation
        
        FastAPI->>Redis: 5. Cache Result (TTL: 3600s)
        FastAPI-->>User: Return Synthesized Response (~2.5s)
    end
            </div>

            <h3 class="text-xl font-bold text-slate-800 mb-4">2. The Ingestion Route (<code>POST /api/v1/graph/store</code>)</h3>
            <p class="text-sm text-slate-500 italic mb-4">This route handles the ETL (Extract, Transform, Load) pipeline, parsing CSV data into graph topologies.</p>

            <!-- Mermaid Flowchart -->
            <div class="mermaid bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 flex justify-center">
flowchart TD
    A[User Submits NIC Code] --> B(Nginx Proxy)
    B --> C{FastAPI Backend}
    C -->|1. Parse CSV| D[Locate NIC Row]
    D --> E[Gemini Extraction API]
    E -->|2. LLM creates structured JSON| F(GraphResult Object)
    F --> G[Neo4j Service]
    
    subgraph Neo4j Transaction
    G --> H[MERGE Nodes]
    H --> I[MERGE Relationships]
    end
    
    I --> J[Return Success Summary]
            </div>
            <p class="text-xs text-slate-400 italic">(Note: Hydration of vectors is handled asynchronously by a dedicated <code>vector-init</code> Docker container to avoid blocking the main API thread).</p>
        </section>

        <!-- Project Structure -->
        <section class="mb-12">
            <h2 class="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">📁 Project Structure</h2>
            <p class="mb-4">The project follows a clean, decoupled microservice architecture orchestrated via Docker Compose.</p>
            <pre class="text-sm"><code>graphrag-enterprise/
├── docker-compose.yml        # Orchestrates Neo4j, Redis, Backend, Frontend, Nginx, Vector-Init
├── nginx/
│   └── nginx.conf            # Reverse proxy routing (/api -> backend, / -> frontend)
├── data/
│   └── nic_2008.csv          # Source of truth dataset
├── screenshots/              # UI references
│   ├── ss1.png
│   ├── ss2.png
│   └── ss3.png
├── frontend/                 # React (Vite) + Tailwind UI
│   ├── Dockerfile
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx           # Main UI (Search & Ingestion tabs)
│       └── api/api.js        # API wrapper config
└── backend/                  # FastAPI Python Application
    ├── Dockerfile
    ├── requirements.txt
    ├── scripts/
    │   └── hydrate_vectors.py # Batch script to generate vectors for new nodes
    └── app/
        ├── main.py           # Uvicorn entry point
        ├── api/
        │   └── routes.py     # Main HTTP endpoints
        ├── core/
        │   └── config.py     # Environment variables
        ├── models/
        │   └── graph_models.py # Pydantic schemas
        └── services/
            ├── cache.py      # Redis connection pool & logic
            ├── graphrag.py   # LLM to Graph orchestration
            ├── llm.py        # Gemini API communication
            └── neo4j_service.py # Graph DB Cypher queries</code></pre>
        </section>

        <!-- Tech Stack & Deep Dive -->
        <section class="mb-12">
            <h2 class="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">🛠️ Tech Stack & Deep Dive</h2>
            <ul class="list-disc pl-6 space-y-3">
                <li><strong>Frontend:</strong> React 18, Vite, Tailwind CSS, Lucide React (Icons). Provides a sleek, single-page application with immediate visual feedback for Cache Hits vs Cache Misses.</li>
                <li><strong>Backend:</strong> FastAPI (Python 3.11). Fully asynchronous execution (<code>async</code>/<code>await</code>) to handle multiple concurrent LLM and database connections without blocking the event loop.</li>
                <li><strong>Knowledge Graph (Neo4j):</strong> Stores <code>Activity</code>, <code>Sector</code>, <code>Product</code>, <code>Process</code>, and <code>RawMaterial</code> nodes.
                    <ul class="list-[circle] pl-6 mt-1 space-y-1">
                        <li>Utilizes a local <strong>HNSW Vector Index</strong> (<code>activity_embeddings</code>) mapped to 768-dimensional space.</li>
                    </ul>
                </li>
                <li><strong>Caching Layer (Redis):</strong> Runs locally on <code>alpine</code>. Slashes repeated query latency from ~3000ms down to ~5ms and protects the Google Gemini API from rate-limiting and token exhaustion.</li>
                <li><strong>AI Models:</strong> Google Gemini 1.5 Pro/Flash for entity extraction and synthesis, and <code>gemini-embedding-2</code> for creating the 768-dimensional vectors.</li>
            </ul>
        </section>

        <!-- Local Development Setup -->
        <section class="mb-12">
            <h2 class="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">⚙️ Local Development Setup</h2>
            <p class="mb-4">To run this application locally, you need <a href="https://www.docker.com/" class="text-indigo-600 hover:underline">Docker</a> and Docker Compose installed.</p>
            
            <h3 class="font-bold mb-2">1. Clone the repository:</h3>
            <pre><code>git clone https://github.com/yourusername/graphrag-enterprise.git
cd graphrag-enterprise</code></pre>

            <h3 class="font-bold mb-2 mt-6">2. Set up your environment variables:</h3>
            <p class="mb-2">Create a <code>.env</code> file in the <code>backend/</code> directory:</p>
            <pre><code>GEMINI_API_KEY=your_google_gemini_api_key
NEO4J_URI=bolt://nic-neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=changeme
REDIS_HOST=nic-redis
REDIS_PORT=6379</code></pre>

            <h3 class="font-bold mb-2 mt-6">3. Build and spin up the microservices:</h3>
            <pre><code>docker compose up --build -d</code></pre>
            <p class="text-sm text-slate-500 mb-6 italic">This will spin up Nginx (Port 80), Neo4j (Port 7474), Redis (Port 6379), the Backend API, and the Frontend.</p>

            <h3 class="font-bold mb-2">4. Access the Application:</h3>
            <p class="mb-6">Open your browser and navigate to: <code>http://localhost</code></p>

            <h3 class="font-bold mb-2">Managing the Vector Database:</h3>
            <p class="mb-2">When you ingest new NIC codes via the UI, they do not automatically get vector embeddings (to save API roundtrips). To hydrate your database and make them searchable:</p>
            <pre><code>docker compose run --rm vector-init</code></pre>
        </section>

        <footer class="text-center text-slate-500 mt-16 pt-8 border-t border-slate-200">
            <p>Built with 💻 and ☕ by [Your Name]</p>
        </footer>

    </main>
</body>
</html>