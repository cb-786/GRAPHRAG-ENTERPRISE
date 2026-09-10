import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Search, 
  RefreshCw, 
  Layers, 
  Sliders, 
  Share2, 
  Sparkles, 
  Plus, 
  AlertCircle,
  FileCode2,
  CheckCircle
} from 'lucide-react';
import GraphVisualizer from './GraphVisualizer';
import NodeInspector from './NodeInspector';
import { transformNicQueryToGraph } from '../utils/graphTransform';
import { API_BASE } from '../api/api';

const SAMPLE_CODES = [
  { code: '01111', label: 'Growing of wheat' },
  { code: '13111', label: 'Spinning of textiles' },
  { code: '24101', label: 'Manufacturing of steel' },
  { code: '62011', label: 'Software programming' },
];

export default function GraphExplorer() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nodeLimit, setNodeLimit] = useState(120);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [stats, setStats] = useState({ total_nodes: 0, total_edges: 0 });

  // Load graph statistics
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/graph/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn("Stats fetch failed", err);
    }
  };

  // Fetch full topology from Neo4j
  const loadTopology = useCallback(async (limit = nodeLimit) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/graph/topology?limit=${limit}`);
      if (!res.ok) {
        throw new Error(`Failed to load graph topology (${res.status})`);
      }
      const data = await res.json();
      setGraphData({
        nodes: data.nodes || [],
        links: data.links || [],
      });
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [nodeLimit]);

  // Initial load
  useEffect(() => {
    loadTopology(nodeLimit);
    fetchStats();
  }, [loadTopology, nodeLimit]);

  // Load specific NIC code graph
  const loadNicCodeGraph = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/graph/query?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        throw new Error(`No graph data for NIC code ${code}. Ingest it first.`);
      }
      const data = await res.json();
      const formatted = transformNicQueryToGraph(data);
      
      // Merge or replace graph data
      setGraphData(formatted);
      if (formatted.nodes.length > 0) {
        setSelectedNode(formatted.nodes[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Expand a node by querying its 1-hop neighbors
  const handleExpandNeighbors = async (nodeId) => {
    setIsExpanding(true);
    try {
      const res = await fetch(`${API_BASE}/v1/graph/node/${encodeURIComponent(nodeId)}/neighbors`);
      if (!res.ok) throw new Error("Could not expand node neighbors");
      const data = await res.json();

      const newNodes = data.nodes || [];
      const newLinks = data.links || [];

      setGraphData((prev) => {
        const existingNodeIds = new Set(prev.nodes.map((n) => n.id));
        const existingLinkKeys = new Set(
          prev.links.map((l) => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            return `${s}->${t}:${l.type}`;
          })
        );

        const mergedNodes = [...prev.nodes];
        newNodes.forEach((node) => {
          if (!existingNodeIds.has(node.id)) {
            mergedNodes.push(node);
            existingNodeIds.add(node.id);
          }
        });

        const mergedLinks = [...prev.links];
        newLinks.forEach((link) => {
          const s = typeof link.source === 'object' ? link.source.id : link.source;
          const t = typeof link.target === 'object' ? link.target.id : link.target;
          const key = `${s}->${t}:${link.type}`;
          if (!existingLinkKeys.has(key)) {
            mergedLinks.push(link);
            existingLinkKeys.add(key);
          }
        });

        return { nodes: mergedNodes, links: mergedLinks };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsExpanding(false);
    }
  };

  // Quick node search in canvas
  const handleSearchNodes = (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchMatches([]);
      return;
    }
    const qLower = q.toLowerCase();
    const matches = graphData.nodes.filter(
      (n) => n.name?.toLowerCase().includes(qLower) || n.id?.toLowerCase().includes(qLower)
    );
    setSearchMatches(matches.slice(0, 8));
  };

  const handleSelectSearchedNode = (node) => {
    setSelectedNode(node);
    setSearchQuery('');
    setSearchMatches([]);
  };

  // Filter links connected to selected node
  const connectedLinks = selectedNode
    ? graphData.links.filter((l) => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return s === selectedNode.id || t === selectedNode.id;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Control Header & Stats Banner */}
      <div className="bg-[#0B0F19]/90 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white font-display">Knowledge Graph Explorer</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Neo4j Connected
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Direct real-time window into the enterprise knowledge graph database. Click any node to inspect attributes or expand 1-hop relationships.
          </p>
        </div>

        {/* Database Metric Counters */}
        <div className="flex items-center gap-3">
          <div className="bg-[#111726] border border-slate-800 rounded-xl px-4 py-2.5 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-mono">DB Nodes</span>
            <span className="text-lg font-bold text-indigo-400 font-mono">{stats.total_nodes}</span>
          </div>
          <div className="bg-[#111726] border border-slate-800 rounded-xl px-4 py-2.5 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-mono">DB Edges</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{stats.total_edges}</span>
          </div>
          <div className="bg-[#111726] border border-slate-800 rounded-xl px-4 py-2.5 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-mono">Loaded</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{graphData.nodes.length}</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Preset NIC Subgraphs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#080C14] p-3 rounded-2xl border border-slate-800/80 shadow-md">
        {/* Search Node Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchNodes(e.target.value)}
            placeholder="Search loaded nodes by name..."
            className="w-full pl-9 pr-4 py-2 bg-[#111726] border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />

          {/* Search Dropdown Matches */}
          {searchMatches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto p-1 divide-y divide-slate-800">
              {searchMatches.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleSelectSearchedNode(node)}
                  className="w-full text-left p-2 hover:bg-indigo-950/40 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors"
                >
                  <span className="font-medium text-slate-200 truncate">{node.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400">
                    {node.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preset Subgraphs Quick-Load */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden lg:inline">
            Load Subgraph:
          </span>
          {SAMPLE_CODES.map((item) => (
            <button
              key={item.code}
              onClick={() => loadNicCodeGraph(item.code)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#111726] hover:bg-indigo-950/60 hover:text-indigo-300 text-slate-300 border border-slate-700/60 transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <FileCode2 className="w-3 h-3 text-indigo-400" />
              <span>{item.code}</span>
            </button>
          ))}

          <button
            onClick={() => loadTopology(nodeLimit)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm ml-auto sm:ml-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh All</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Visual Graph Canvas */}
      <div className="relative">
        <GraphVisualizer
          data={graphData}
          selectedNodeId={selectedNode?.id}
          onNodeClick={(node) => setSelectedNode(node)}
          height={620}
          title="Knowledge Graph Network"
          subtitle="Drag nodes to reposition • Scroll to zoom • Click node to inspect & expand"
        />

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onExpandNeighbors={handleExpandNeighbors}
            isExpanding={isExpanding}
            connectedLinks={connectedLinks}
            allNodes={graphData.nodes}
          />
        )}
      </div>
    </div>
  );
}
