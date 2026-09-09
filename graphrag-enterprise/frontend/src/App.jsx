import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Database, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Server, 
  Network, 
  Layers, 
  Cpu, 
  Copy, 
  Check, 
  Sparkles, 
  Share2, 
  Info,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

import GraphVisualizer from './components/GraphVisualizer';
import NodeInspector from './components/NodeInspector';
import GraphExplorer from './components/GraphExplorer';
import ArchitectureModal from './components/ArchitectureModal';
import { transformRagContextToGraph, transformNicQueryToGraph } from './utils/graphTransform';
import { API_BASE } from './api/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [systemStatus, setSystemStatus] = useState(null);
  const [showArchModal, setShowArchModal] = useState(false);

  // Poll system health once on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/status`);
        if (res.ok) {
          const data = await res.json();
          setSystemStatus(data);
        }
      } catch (e) {
        console.warn('Status check unreachable', e);
      }
    };
    checkStatus();
  }, []);

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 font-sans selection:bg-indigo-600 selection:text-white flex flex-col">
      {/* Top Enterprise Navigation Header */}
      <header className="bg-[#0B0F19]/90 border-b border-slate-800/80 sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 p-0.5 shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
                  <Network className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight text-white font-display">
                    GovIntel<span className="text-indigo-400">.AI</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                    GraphRAG 2.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
                  National Industrial Classification & Knowledge Graph Engine
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'search'
                    ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>

              <button
                onClick={() => setActiveTab('explorer')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'explorer'
                    ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Graph Explorer</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden md:inline-block"></span>
              </button>

              <button
                onClick={() => setActiveTab('ingest')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'ingest'
                    ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Ingestion</span>
              </button>
            </div>

            {/* System Telemetry & Architecture Modal Trigger */}
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={() => setShowArchModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-[#111726] hover:bg-slate-800/80 border border-slate-700/60 transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span>Architecture</span>
              </button>

              {/* Status Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono bg-[#111726] border border-slate-800">
                <span className={`w-2 h-2 rounded-full ${systemStatus?.services?.neo4j === 'up' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className="text-slate-300">Neo4j: {systemStatus?.services?.neo4j || 'connected'}</span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'search' && <SearchInterface onOpenExplorer={() => setActiveTab('explorer')} />}
        {activeTab === 'explorer' && <GraphExplorer />}
        {activeTab === 'ingest' && <IngestionInterface onExplore={() => setActiveTab('explorer')} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#080C14] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>GovIntel.AI • Enterprise B2G GraphRAG Semantic Engine</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI Backend</span>
            <span>•</span>
            <span>Neo4j 5.20 Graph</span>
            <span>•</span>
            <span>Redis 7.2 Cache</span>
            <span>•</span>
            <span>Google Gemini Flash</span>
          </div>
        </div>
      </footer>

      {/* Architecture Overview Modal */}
      <ArchitectureModal isOpen={showArchModal} onClose={() => setShowArchModal(false)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH INTERFACE (GraphRAG with Live Graph Visualization)
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_SEARCH_PROMPTS = [
  "making clothes and garments",
  "cultivation of wheat and cereals",
  "software programming and cloud SaaS",
  "iron and steel smelting",
  "wholesale of pharmaceuticals",
];

function SearchInterface({ onOpenExplorer }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showRawContext, setShowRawContext] = useState(false);
  const [selectedGraphNode, setSelectedGraphNode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [latency, setLatency] = useState(null);

  const handleSearch = async (queryText = query) => {
    const q = queryText.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedGraphNode(null);
    setShowRawContext(false);

    const startTime = performance.now();

    try {
      const res = await fetch(`${API_BASE}/v1/search/rag?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));

      if (!res.ok) throw new Error(data.detail || 'Classification failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyNicCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Convert raw_graph_context_used to Graph data
  const visualGraphData = result ? transformRagContextToGraph(result.raw_graph_context_used) : { nodes: [], links: [] };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Multi-Hop Knowledge Graph Grounded Classification</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
          Semantic <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">GraphRAG</span> Search
        </h1>
        <p className="text-slate-400 text-base leading-relaxed">
          Describe any industrial or business activity in natural language. GovIntel.AI queries the Neo4j knowledge graph radially and synthesizes verified National Industrial Classification codes.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-3xl mx-auto space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
          <div className="relative flex items-center bg-[#0B0F19] p-2 rounded-2xl border border-slate-700/80 shadow-2xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
            <Search className="ml-3 w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., spinning yarn from cotton, forging structural steel, cloud data center hosting..."
              className="w-full px-3 py-3 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-base font-sans"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center gap-2 flex-shrink-0"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Reasoning...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Classify</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Try:</span>
          {QUICK_SEARCH_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(prompt);
                handleSearch(prompt);
              }}
              className="px-3 py-1 bg-[#111726] hover:bg-indigo-950/70 text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-700/50 rounded-lg transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-3xl mx-auto p-4 bg-red-950/50 border border-red-800/80 rounded-2xl flex items-start gap-3 text-red-300 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
          <div>
            <h4 className="font-semibold text-sm">Classification Request Failed</h4>
            <p className="text-xs text-red-400/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Classification & Graph Results Grid */}
      {result && result.classification && (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Telemetry Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0B0F19]/80 border border-slate-800 rounded-xl text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Query:</span>
              <span className="text-slate-200 font-semibold">"{result.query}"</span>
            </div>
            <div className="flex items-center gap-3">
              {latency && (
                <span className="text-slate-400">
                  Latency: <strong className="text-slate-200">{latency}ms</strong>
                </span>
              )}
              {result.cached ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded-full font-bold">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Redis Cache Hit (&lt;5ms)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded-full font-bold">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  GraphRAG Traversal + LLM Synthesized
                </span>
              )}
            </div>
          </div>

          {/* Side-by-Side: Synthesis Card & Interactive Neo4j Graph */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: AI Synthesis & NIC Classification (5 cols) */}
            <div className="lg:col-span-5 bg-[#0B0F19] border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
              
              {/* Header with NIC Code */}
              <div className="p-6 bg-gradient-to-b from-[#111726] to-[#0B0F19] border-b border-slate-800">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1 bg-indigo-600 text-white text-xs font-mono font-bold rounded-lg shadow-md shadow-indigo-600/30">
                      NIC {result.classification.nic_code}
                    </span>
                    <button
                      onClick={() => copyNicCode(result.classification.nic_code)}
                      title="Copy NIC Code"
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Class 5-Digit</span>
                </div>

                <h2 className="text-xl font-bold text-white tracking-tight leading-snug font-display">
                  {result.classification.activity_name}
                </h2>
              </div>

              {/* AI Synthesis Body */}
              <div className="p-6 space-y-4 flex-1">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Graph Grounding & Synthesis
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans">
                    {result.classification.explanation}
                  </p>
                </div>

                {/* Extracted Graph Facts Used */}
                <div className="border-t border-slate-800/80 pt-4 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Retrieved Graph Entities ({visualGraphData.nodes.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {visualGraphData.nodes.map((node) => (
                      <span
                        key={node.id}
                        onClick={() => setSelectedGraphNode(node)}
                        className="cursor-pointer px-2.5 py-1 rounded-lg text-xs bg-[#111726] hover:bg-indigo-950 text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-700/50 transition-colors"
                      >
                        <strong className="text-indigo-400 mr-1">{node.label}:</strong>
                        {node.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 bg-[#080C14] border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={onOpenExplorer}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                >
                  <span>Open Full Database Explorer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowRawContext(!showRawContext)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showRawContext ? 'Hide Raw JSON' : 'Inspect Raw JSON'}
                </button>
              </div>

              {/* Collapsible Raw JSON Context */}
              {showRawContext && (
                <div className="p-4 bg-[#05070D] border-t border-slate-800 max-h-60 overflow-y-auto">
                  <pre className="text-[11px] text-emerald-400 font-mono leading-tight">
                    {JSON.stringify(result.raw_graph_context_used, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Right Column: Live Neo4j Force-Directed Subgraph (7 cols) */}
            <div className="lg:col-span-7 relative">
              <GraphVisualizer
                data={visualGraphData}
                selectedNodeId={selectedGraphNode?.id}
                onNodeClick={(node) => setSelectedGraphNode(node)}
                height={560}
                title="Retrieved Knowledge Subgraph"
                subtitle="Live radial traversal grounded in Neo4j"
              />

              {/* Node Inspector Overlay */}
              {selectedGraphNode && (
                <NodeInspector
                  node={selectedGraphNode}
                  onClose={() => setSelectedGraphNode(null)}
                  allNodes={visualGraphData.nodes}
                  connectedLinks={visualGraphData.links.filter(
                    (l) => l.source === selectedGraphNode.id || l.target === selectedGraphNode.id
                  )}
                />
              )}
            </div>

          </div>

        </div>
      )}

      {/* Empty / No Match State */}
      {result && !result.classification && (
        <div className="max-w-2xl mx-auto p-8 bg-[#0B0F19] border border-slate-800 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-800/60 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white font-display">No Graph Context Found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {result.message || 'No semantic anchors matched this query in the current database index.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => onOpenExplorer()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-colors shadow-md"
            >
              Browse Knowledge Graph Database
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INGESTION INTERFACE (ETL + Immediate Graph Visualization)
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_INGEST_CODES = [
  { code: '01111', label: 'Wheat & Cereals' },
  { code: '13111', label: 'Cotton Yarn & Spinning' },
  { code: '24101', label: 'Steel & Ferro Alloys' },
  { code: '62011', label: 'Software Development' },
];

function IngestionInterface({ onExplore }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [ingestedGraph, setIngestedGraph] = useState(null);

  const handleIngest = async (e) => {
    if (e) e.preventDefault();
    if (!code.trim() || code.length !== 5) {
      setError("Please provide a valid 5-digit NIC code.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setIngestedGraph(null);

    try {
      const res = await fetch(`${API_BASE}/v1/graph/store?code=${encodeURIComponent(code)}`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Ingestion failed');
      setResult(data);

      // Immediately fetch the created graph topology to render it!
      const graphRes = await fetch(`${API_BASE}/v1/graph/query?code=${encodeURIComponent(code)}`);
      if (graphRes.ok) {
        const graphData = await graphRes.json();
        setIngestedGraph(transformNicQueryToGraph(graphData));
      }

      setCode(''); // clear input on success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="text-3xl font-extrabold text-white font-display">Data Ingestion Portal</h2>
        <p className="text-slate-400 text-sm">
          Extract industrial entities and dynamic relationship graphs from the master NIC 2008 dataset and hydrate Neo4j.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-[#0B0F19] p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
        <form onSubmit={handleIngest} className="space-y-4">
          <div>
            <label htmlFor="nic-code-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              5-Digit NIC Code
            </label>
            <div className="flex gap-2">
              <input
                id="nic-code-input"
                type="text"
                maxLength={5}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g., 01111"
                className="flex-1 px-4 py-3.5 bg-[#111726] border border-slate-700/70 rounded-xl text-lg font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || code.length !== 5}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95 flex items-center gap-2 flex-shrink-0"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Extract & Store</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Code Suggestions */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-500">Quick Samples:</span>
            {SAMPLE_INGEST_CODES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setCode(item.code)}
                className="px-2.5 py-1 bg-[#111726] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors font-mono"
              >
                {item.code} ({item.label})
              </button>
            ))}
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {result && (
          <div className="p-5 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-emerald-300 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Successfully Ingested NIC {result.nic_code}!</span>
              </div>
              <button
                onClick={onExplore}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <span>View in Graph Explorer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono pt-1">
              <div className="bg-[#111726] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">NIC Code</span>
                <span className="text-sm font-bold text-white">{result.nic_code}</span>
              </div>
              <div className="bg-[#111726] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Nodes Written</span>
                <span className="text-sm font-bold text-indigo-400">{result.nodes_written}</span>
              </div>
              <div className="bg-[#111726] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Edges Linked</span>
                <span className="text-sm font-bold text-emerald-400">{result.edges_written}</span>
              </div>
            </div>

            {/* Render Ingested Graph Directly */}
            {ingestedGraph && (
              <div className="pt-2">
                <GraphVisualizer
                  data={ingestedGraph}
                  height={380}
                  title={`Ingested Knowledge Topology for NIC ${result.nic_code}`}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}