import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Layers, 
  ArrowUpRight, 
  PlusCircle, 
  Check, 
  Activity, 
  Tag, 
  Info,
  ChevronRight,
  Database
} from 'lucide-react';
import { ENTITY_COLORS } from './GraphVisualizer';

export default function NodeInspector({
  node,
  onClose,
  onExpandNeighbors,
  isExpanding = false,
  connectedLinks = [],
  allNodes = [],
}) {
  const [expandedSuccess, setExpandedSuccess] = useState(false);

  if (!node) return null;

  const styling = ENTITY_COLORS[node.label] || ENTITY_COLORS.Default;

  // Calculate connected nodes
  const connections = connectedLinks.map((link) => {
    const sId = typeof link.source === 'object' ? link.source.id : link.source;
    const tId = typeof link.target === 'object' ? link.target.id : link.target;
    const isOutgoing = sId === node.id;
    const otherId = isOutgoing ? tId : sId;
    const otherNode = allNodes.find((n) => n.id === otherId) || { id: otherId, name: otherId, label: 'Entity' };
    
    return {
      link,
      relType: link.type || link.rel_type || 'RELATED_TO',
      isOutgoing,
      otherNode,
    };
  });

  const handleExpand = async () => {
    if (onExpandNeighbors) {
      await onExpandNeighbors(node.id);
      setExpandedSuccess(true);
      setTimeout(() => setExpandedSuccess(false), 2000);
    }
  };

  return (
    <div className="absolute top-16 right-4 z-20 w-80 sm:w-96 max-h-[85%] bg-[#0B0F19]/95 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-900/80 to-transparent">
        <div className="flex items-center gap-2.5 min-w-0">
          <span 
            className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-lg" 
            style={{ 
              backgroundColor: styling.fill,
              boxShadow: `0 0 10px ${styling.fill}`
            }}
          ></span>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${styling.badge}`}>
              {node.label || 'Entity'}
            </span>
            <h4 className="text-base font-bold text-white tracking-tight mt-1 truncate">
              {node.name || node.id}
            </h4>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto space-y-4 text-xs">
        {/* Node Properties */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Node Attributes
          </span>
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-3 space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Node ID:</span>
              <span className="text-indigo-300 font-medium truncate max-w-[200px]" title={node.id}>
                {node.id}
              </span>
            </div>
            {node.properties?.nic_code && (
              <div className="flex justify-between">
                <span className="text-slate-400">NIC Code:</span>
                <span className="text-emerald-400 font-bold">{node.properties.nic_code}</span>
              </div>
            )}
            {node.properties?.description && (
              <div className="pt-2 border-t border-slate-800/60 text-slate-300 font-sans text-xs">
                {node.properties.description}
              </div>
            )}
          </div>
        </div>

        {/* Expand Node Action */}
        <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-3 flex items-center justify-between gap-2">
          <div>
            <span className="text-slate-200 font-semibold text-xs block">Expand Neighborhood</span>
            <span className="text-[11px] text-slate-400">Fetch connected nodes from Neo4j</span>
          </div>
          <button
            onClick={handleExpand}
            disabled={isExpanding}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-all shadow-md active:scale-95"
          >
            {isExpanding ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : expandedSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <PlusCircle className="w-3.5 h-3.5" />
            )}
            <span>{expandedSuccess ? 'Added!' : 'Expand'}</span>
          </button>
        </div>

        {/* Relationships list */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Connected Edges ({connections.length})
            </span>
          </span>

          {connections.length === 0 ? (
            <p className="text-slate-500 italic p-2 bg-[#111726]/60 rounded-lg">No direct links in current view</p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {connections.map((conn, idx) => {
                const targetStyling = ENTITY_COLORS[conn.otherNode.label] || ENTITY_COLORS.Default;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-[#111726] hover:bg-[#182035] border border-slate-800 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700/60">
                        {conn.relType}
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-200 font-medium truncate max-w-[140px]" title={conn.otherNode.name}>
                        {conn.otherNode.name}
                      </span>
                    </div>
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0 ml-1"
                      style={{ backgroundColor: targetStyling.fill }}
                      title={conn.otherNode.label}
                    ></span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
