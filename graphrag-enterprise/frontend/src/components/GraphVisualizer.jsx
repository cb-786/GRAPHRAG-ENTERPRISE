import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Play, 
  Pause, 
  Crosshair, 
  Filter, 
  Eye, 
  EyeOff, 
  Sparkles 
} from 'lucide-react';

// Entity Color Palette with matching glow gradients
export const ENTITY_COLORS = {
  Activity: {
    fill: '#6366F1',      // Electric Indigo
    glow: 'rgba(99, 102, 241, 0.45)',
    border: '#818CF8',
    text: '#E0E7FF',
    badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60',
  },
  Sector: {
    fill: '#10B981',      // Emerald Green
    glow: 'rgba(16, 185, 129, 0.45)',
    border: '#34D399',
    text: '#D1FAE5',
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
  },
  Product: {
    fill: '#F59E0B',      // Golden Amber
    glow: 'rgba(245, 158, 11, 0.45)',
    border: '#FBBF24',
    text: '#FEF3C7',
    badge: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
  },
  RawMaterial: {
    fill: '#F43F5E',      // Rose Pink
    glow: 'rgba(244, 63, 94, 0.45)',
    border: '#FB7185',
    text: '#FFE4E6',
    badge: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
  },
  Process: {
    fill: '#A855F7',      // Vivid Purple
    glow: 'rgba(168, 85, 247, 0.45)',
    border: '#C084FC',
    text: '#F3E8FF',
    badge: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
  },
  Default: {
    fill: '#0EA5E9',      // Sky Blue
    glow: 'rgba(14, 165, 233, 0.45)',
    border: '#38BDF8',
    text: '#E0F2FE',
    badge: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
  },
};

export default function GraphVisualizer({
  data = { nodes: [], links: [] },
  onNodeClick,
  selectedNodeId = null,
  height = 520,
  interactive = true,
  title = "Interactive Knowledge Subgraph",
  subtitle = null,
}) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 600, height: height });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [particlesActive, setParticlesActive] = useState(true);
  const [physicsActive, setPhysicsActive] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterTypes, setFilterTypes] = useState({
    Activity: true,
    Sector: true,
    Product: true,
    RawMaterial: true,
    Process: true,
  });

  // Dynamically observe container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth || 600,
          height: isFullscreen ? window.innerHeight - 80 : (clientHeight || height),
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [height, isFullscreen]);

  // Compute node neighbors for highlighting
  const neighborsMap = useMemo(() => {
    const map = new Map();
    if (!data || !data.links) return map;
    data.links.forEach((link) => {
      const sId = typeof link.source === 'object' ? link.source.id : link.source;
      const tId = typeof link.target === 'object' ? link.target.id : link.target;
      if (!map.has(sId)) map.set(sId, new Set());
      if (!map.has(tId)) map.set(tId, new Set());
      map.get(sId).add(tId);
      map.get(tId).add(sId);
    });
    return map;
  }, [data]);

  // Filter nodes & links based on active entity filters
  const filteredData = useMemo(() => {
    if (!data || !data.nodes) return { nodes: [], links: [] };

    const validNodeIds = new Set();
    const nodes = data.nodes.filter((node) => {
      const type = node.label || 'Activity';
      const keep = filterTypes[type] !== false;
      if (keep) validNodeIds.add(node.id);
      return keep;
    });

    const links = (data.links || []).filter((link) => {
      const sId = typeof link.source === 'object' ? link.source.id : link.source;
      const tId = typeof link.target === 'object' ? link.target.id : link.target;
      return validNodeIds.has(sId) && validNodeIds.has(tId);
    });

    return { nodes, links };
  }, [data, filterTypes]);

  // Handle node hover
  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node || null);
    const newHighlightNodes = new Set();
    const newHighlightLinks = new Set();

    if (node) {
      newHighlightNodes.add(node.id);
      const neighbors = neighborsMap.get(node.id);
      if (neighbors) {
        neighbors.forEach((nId) => newHighlightNodes.add(nId));
      }
      (filteredData.links || []).forEach((link) => {
        const sId = typeof link.source === 'object' ? link.source.id : link.source;
        const tId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sId === node.id || tId === node.id) {
          newHighlightLinks.add(link);
        }
      });
    }

    setHighlightNodes(newHighlightNodes);
    setHighlightLinks(newHighlightLinks);
  }, [neighborsMap, filteredData.links]);

  // Center & zoom fit
  const handleZoomFit = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50);
    }
  };

  const handleZoomIn = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom();
      fgRef.current.zoom(currentZoom * 1.3, 300);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom();
      fgRef.current.zoom(currentZoom / 1.3, 300);
    }
  };

  const togglePhysics = () => {
    if (fgRef.current) {
      if (physicsActive) {
        fgRef.current.pauseAnimation();
      } else {
        fgRef.current.resumeAnimation();
      }
      setPhysicsActive(!physicsActive);
    }
  };

  // Custom Node Canvas Renderer
  const renderCustomNode = useCallback((node, ctx, globalScale) => {
    const isHovered = hoveredNode?.id === node.id;
    const isSelected = selectedNodeId === node.id;
    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
    const labelType = node.label || 'Default';
    const styling = ENTITY_COLORS[labelType] || ENTITY_COLORS.Default;

    // Node sizing based on entity type
    let baseRadius = 6;
    if (labelType === 'Activity') baseRadius = 10;
    else if (labelType === 'Sector') baseRadius = 8;
    else if (labelType === 'Product') baseRadius = 7;
    const r = baseRadius;

    ctx.save();

    // Dim out non-highlighted nodes
    if (!isHighlighted) {
      ctx.globalAlpha = 0.2;
    }

    // Outer Glow Effect
    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 5 / Math.min(globalScale, 2), 0, 2 * Math.PI, false);
      ctx.fillStyle = styling.glow;
      ctx.fill();

      // Pulsing Selection Ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 3 / Math.min(globalScale, 2), 0, 2 * Math.PI, false);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI, false);
      ctx.fillStyle = styling.glow;
      ctx.fill();
    }

    // Core Solid Node Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = styling.fill;
    ctx.fill();
    ctx.strokeStyle = styling.border;
    ctx.lineWidth = 1.2 / Math.min(globalScale, 2);
    ctx.stroke();

    // Text Label with Capsule Pill Background
    const name = node.name || node.id;
    const maxChars = 24;
    const label = name.length > maxChars ? `${name.substring(0, maxChars)}…` : name;
    
    // Scale text comfortably with zoom
    const fontSize = Math.max(10 / globalScale, 3.2);
    ctx.font = `600 ${fontSize}px 'Inter', sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const textPadding = 4 / globalScale;
    const pillHeight = fontSize + textPadding * 1.5;
    const pillY = node.y + r + 3 / globalScale;

    // Background Pill
    ctx.fillStyle = isHovered || isSelected ? 'rgba(15, 23, 42, 0.95)' : 'rgba(11, 15, 25, 0.85)';
    ctx.strokeStyle = isHovered || isSelected ? styling.border : 'rgba(51, 65, 85, 0.6)';
    ctx.lineWidth = 0.8 / globalScale;
    
    const pillX = node.x - textWidth / 2 - textPadding;
    const pillW = textWidth + textPadding * 2;
    const pillRadius = 3 / globalScale;

    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillHeight, pillRadius);
    ctx.fill();
    ctx.stroke();

    // Text Foreground
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isHovered || isSelected ? '#FFFFFF' : styling.text;
    ctx.fillText(label, node.x, pillY + pillHeight / 2);

    ctx.restore();
  }, [hoveredNode, selectedNodeId, highlightNodes]);

  // Custom Link Canvas Renderer (drawn after link line for relationship badges)
  const renderCustomLink = useCallback((link, ctx, globalScale) => {
    if (globalScale < 1.4) return; // Only draw labels when zoomed in for readability
    const relType = link.type || link.rel_type;
    if (!relType) return;

    const start = link.source;
    const end = link.target;
    if (!start || !end || typeof start.x !== 'number' || typeof end.x !== 'number') return;

    const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(link);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    ctx.save();
    if (!isHighlighted) ctx.globalAlpha = 0.2;

    const fontSize = Math.max(7 / globalScale, 2.5);
    ctx.font = `500 ${fontSize}px 'JetBrains Mono', monospace`;
    const textWidth = ctx.measureText(relType).width;
    const pad = 2 / globalScale;

    // Draw small badge along edge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 0.5 / globalScale;

    ctx.beginPath();
    ctx.roundRect(midX - textWidth / 2 - pad, midY - fontSize / 2 - pad, textWidth + pad * 2, fontSize + pad * 2, 2 / globalScale);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#A5B4FC';
    ctx.fillText(relType, midX, midY);

    ctx.restore();
  }, [highlightLinks]);

  // Toggle single entity type filter
  const toggleFilter = (type) => {
    setFilterTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const totalFilteredNodes = filteredData.nodes.length;
  const totalFilteredLinks = filteredData.links.length;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-[#080C14] shadow-2xl transition-all duration-300 flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen bg-[#060911]' : ''
      }`}
      style={{ height: isFullscreen ? '100vh' : `${dimensions.height}px` }}
    >
      {/* Top Header & Toolbar */}
      <div className="absolute top-0 inset-x-0 z-10 p-3 bg-gradient-to-b from-[#080C14]/95 via-[#080C14]/80 to-transparent flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Title & Badge */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h3 className="text-sm font-semibold text-slate-200 tracking-wide font-display">
              {title}
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800/80 text-slate-400 border border-slate-700/60">
            {totalFilteredNodes} nodes • {totalFilteredLinks} links
          </span>
          {subtitle && (
            <span className="hidden sm:inline text-xs text-slate-400 font-sans">
              {subtitle}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0D1322]/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/50 shadow-lg">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomFit}
            title="Fit to Canvas"
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/70 rounded-lg transition-colors"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          
          <div className="w-px h-4 bg-slate-700 mx-0.5"></div>

          <button
            onClick={() => setParticlesActive(!particlesActive)}
            title={particlesActive ? "Pause Flow Particles" : "Enable Flow Particles"}
            className={`p-1.5 rounded-lg transition-colors ${
              particlesActive 
                ? 'text-indigo-400 bg-indigo-950/60 border border-indigo-800/40' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/70'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={togglePhysics}
            title={physicsActive ? "Freeze Simulation Physics" : "Unfreeze Physics"}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors"
          >
            {physicsActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Force Graph Canvas */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
        {totalFilteredNodes === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-600">
              <Crosshair className="w-6 h-6 animate-pulse" />
            </div>
            <p className="font-medium text-slate-400 text-sm">No Graph Nodes to Render</p>
            <p className="text-xs text-slate-600 max-w-xs mt-1">
              Either the current filters exclude all nodes or no graph entities match this query.
            </p>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={filteredData}
            backgroundColor="#080C14"
            nodeId="id"
            nodeCanvasObject={renderCustomNode}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 16, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={renderCustomLink}
            linkColor={(link) => {
              if (highlightLinks.size > 0 && !highlightLinks.has(link)) {
                return 'rgba(51, 65, 85, 0.15)';
              }
              return 'rgba(99, 102, 241, 0.35)';
            }}
            linkWidth={(link) => (highlightLinks.has(link) ? 2.2 : 1.2)}
            linkDirectionalArrowLength={4.5}
            linkDirectionalArrowRelPos={0.92}
            linkDirectionalArrowColor={() => '#818CF8'}
            linkDirectionalParticles={particlesActive ? (link) => (highlightLinks.size === 0 || highlightLinks.has(link) ? 3 : 0) : 0}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={2.4}
            linkDirectionalParticleColor={() => '#A5B4FC'}
            onNodeHover={handleNodeHover}
            onNodeClick={(node) => {
              if (onNodeClick) onNodeClick(node);
            }}
            cooldownTicks={120}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            onEngineStop={() => {
              // initial auto-fit when simulation stabilizes
            }}
          />
        )}
      </div>

      {/* Bottom Entity Type Legend & Filter Bar */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-[#0D1322]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/50 shadow-xl">
          <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" />
            Entities:
          </span>
          {Object.entries(ENTITY_COLORS).map(([key, style]) => {
            if (key === 'Default') return null;
            const active = filterTypes[key] !== false;
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  active 
                    ? style.badge 
                    : 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60 line-through'
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: active ? style.fill : '#64748B' }}
                ></span>
                <span>{key}</span>
                {active ? <Eye className="w-3 h-3 ml-0.5 opacity-60" /> : <EyeOff className="w-3 h-3 ml-0.5 opacity-40" />}
              </button>
            );
          })}
        </div>

        {/* Hover / Selected Info Tooltip */}
        {hoveredNode && (
          <div className="pointer-events-auto bg-[#0F172A]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-2xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <span 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: (ENTITY_COLORS[hoveredNode.label] || ENTITY_COLORS.Default).fill }}
            ></span>
            <span className="text-slate-400 font-mono">{hoveredNode.label}:</span>
            <span className="font-semibold text-white max-w-[200px] truncate">{hoveredNode.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
