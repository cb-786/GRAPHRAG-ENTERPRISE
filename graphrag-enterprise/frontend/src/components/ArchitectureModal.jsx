import React from 'react';
import { X, Network, Cpu, Database, Zap, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display">System Architecture & GraphRAG Pipeline</h3>
              <p className="text-xs text-slate-400">How GovIntel.AI classifies unstructured business descriptions using Knowledge Graphs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-sm text-slate-300">
          {/* Why GraphRAG */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-4">
            <h4 className="text-sm font-bold text-indigo-400 mb-1 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              The "Secret Sauce" (Why GraphRAG over Plain Vector RAG?)
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Traditional RAG relies purely on high-dimensional vector distance, which leads to hallucinations on dense, regulatory classifications like NIC codes. GovIntel.AI locates the closest vector anchor, then <strong>radially traverses Neo4j 1-hop outward</strong> to gather deterministic business facts (Sectors, Products, Raw Materials, and Processes). The LLM synthesizes only based on verified graph topology.
            </p>
          </div>

          {/* 5-Step Pipeline Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Query Execution Flow (Under the Hood)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              <div className="bg-[#111726] border border-slate-800/80 p-3 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono flex items-center justify-center mb-2">1</span>
                <p className="font-semibold text-white">Cache Intercept</p>
                <p className="text-[11px] text-slate-500 mt-1">Checks Redis. If cached, returns instantly in &lt;5ms.</p>
              </div>

              <div className="bg-[#111726] border border-slate-800/80 p-3 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-indigo-900 text-indigo-300 font-mono flex items-center justify-center mb-2">2</span>
                <p className="font-semibold text-white">Gemini Vector</p>
                <p className="text-[11px] text-slate-500 mt-1">Generates 768-dim query embedding vector.</p>
              </div>

              <div className="bg-[#111726] border border-slate-800/80 p-3 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-emerald-900 text-emerald-300 font-mono flex items-center justify-center mb-2">3</span>
                <p className="font-semibold text-white">Graph Traversal</p>
                <p className="text-[11px] text-slate-500 mt-1">Neo4j cosine index + 1-hop radial subgraph query.</p>
              </div>

              <div className="bg-[#111726] border border-slate-800/80 p-3 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-purple-900 text-purple-300 font-mono flex items-center justify-center mb-2">4</span>
                <p className="font-semibold text-white">LLM Synthesis</p>
                <p className="text-[11px] text-slate-500 mt-1">Gemini analyzes grounded graph context.</p>
              </div>

              <div className="bg-[#111726] border border-slate-800/80 p-3 rounded-xl">
                <span className="w-5 h-5 rounded-full bg-amber-900 text-amber-300 font-mono flex items-center justify-center mb-2">5</span>
                <p className="font-semibold text-white">Cache & Return</p>
                <p className="text-[11px] text-slate-500 mt-1">Caches result for 1 hour & renders interactive graph.</p>
              </div>
            </div>
          </div>

          {/* Microservices Stack */}
          <div className="border-t border-slate-800 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Infrastructure Components
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#0E1526] p-3 rounded-xl border border-slate-800/60">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  FastAPI
                </div>
                <span className="text-[11px] text-slate-400">Async backend & ETL pipeline</span>
              </div>
              <div className="bg-[#0E1526] p-3 rounded-xl border border-slate-800/60">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  Neo4j 5.20
                </div>
                <span className="text-[11px] text-slate-400">Knowledge Graph & Vector Index</span>
              </div>
              <div className="bg-[#0E1526] p-3 rounded-xl border border-slate-800/60">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Redis 7.2
                </div>
                <span className="text-[11px] text-slate-400">Ultra-low latency query cache</span>
              </div>
              <div className="bg-[#0E1526] p-3 rounded-xl border border-slate-800/60">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  Google Gemini
                </div>
                <span className="text-[11px] text-slate-400">Embeddings & Reasoning Engine</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0E1526]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}
