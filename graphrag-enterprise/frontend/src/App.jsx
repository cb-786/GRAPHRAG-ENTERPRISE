import React, { useState } from 'react';
import { Search, Database, Zap, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Server } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-600" />
              <span className="font-bold text-xl tracking-tight text-slate-800">GovIntel<span className="text-indigo-600">.AI</span></span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'search' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                GraphRAG Search
              </button>
              <button
                onClick={() => setActiveTab('ingest')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'ingest' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Data Ingestion
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'search' ? <SearchInterface /> : <IngestionInterface />}
      </main>
    </div>
  );
}

// ─── SEARCH INTERFACE (Iteration 8 & 9) ──────────────────────────────────────

function SearchInterface() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showRawContext, setShowRawContext] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowRawContext(false);

    try {
      // Calls Nginx proxy -> backend -> /search/rag
      const res = await fetch(`/api/v1/search/rag?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Search failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Semantic GraphRAG Search</h1>
        <p className="text-slate-500">Describe a business activity in natural language, and the AI will classify it using the local Neo4j graph database.</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., making clothes, steel forging, software development..."
            className="w-full pl-12 pr-24 py-4 bg-white border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg transition-shadow"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Searching...' : 'Classify'}
          </button>
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Results State */}
      {result && result.classification && (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Header / NIC Code */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-bold rounded-full border border-indigo-200">
                    NIC Code {result.classification.nic_code}
                  </span>
                  {result.cached && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                      <Zap className="w-3 h-3" />
                      Redis Cache Hit
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{result.classification.activity_name}</h2>
              </div>
            </div>

            {/* AI Explanation */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">AI Synthesis</h3>
              <p className="text-slate-700 leading-relaxed text-lg">
                {result.classification.explanation}
              </p>
            </div>

            {/* Raw Graph Context Toggle */}
            <div className="border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setShowRawContext(!showRawContext)}
                className="w-full p-4 flex items-center justify-between text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  <span>View Retrieved Graph Nodes ({result.raw_graph_context_used[0]?.context_neighborhood?.length || 0})</span>
                </div>
                {showRawContext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showRawContext && (
                <div className="p-4 pt-0">
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs text-emerald-400 font-mono">
                      {JSON.stringify(result.raw_graph_context_used, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Empty / No Match State */}
      {result && !result.classification && (
        <div className="max-w-2xl mx-auto p-6 bg-slate-100 border border-slate-200 rounded-xl text-center text-slate-600">
          <p className="font-medium">{result.message}</p>
          <p className="text-sm mt-2">Try ingesting the relevant NIC code data first via the Data Ingestion tab.</p>
        </div>
      )}
    </div>
  );
}

// ─── INGESTION INTERFACE (Iteration 5) ───────────────────────────────────────

function IngestionInterface() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleIngest = async (e) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 5) {
      setError("Please enter a valid 5-digit NIC code.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Calls Nginx proxy -> backend -> POST /graph/store
      const res = await fetch(`/api/v1/graph/store?code=${encodeURIComponent(code)}`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail || 'Ingestion failed');
      setResult(data);
      setCode(''); // clear input on success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Ingest NIC Code</h2>
          <p className="text-slate-500 mt-1">Extract entities from the dataset and build the Neo4j graph.</p>
        </div>

        <form onSubmit={handleIngest} className="space-y-4">
          <div>
            <label htmlFor="nic-code" className="block text-sm font-medium text-slate-700 mb-1">
              5-Digit NIC Code
            </label>
            <input
              id="nic-code"
              type="text"
              maxLength={5}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // Numbers only
              placeholder="e.g., 13111"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors text-lg font-mono"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || code.length !== 5}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing via Gemini...
              </>
            ) : (
              'Extract & Store in Neo4j'
            )}
          </button>
        </form>

        {/* Error State */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Success State */}
        {result && (
          <div className="mt-6 p-5 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-800 font-bold mb-3">
              <CheckCircle2 className="w-5 h-5" />
              Successfully Ingested!
            </div>
            <div className="space-y-2 text-sm text-emerald-900">
              <div className="flex justify-between border-b border-emerald-200/50 pb-2">
                <span className="opacity-80">NIC Code:</span>
                <span className="font-mono font-bold">{result.nic_code}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-200/50 py-2">
                <span className="opacity-80">Graph Nodes Written:</span>
                <span className="font-bold">{result.nodes_written}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="opacity-80">Graph Edges Linked:</span>
                <span className="font-bold">{result.edges_written}</span>
              </div>
            </div>
            <p className="text-xs text-emerald-600 mt-4">
              * Remember to run the <code>vector-init</code> hydration script to make this node searchable!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}