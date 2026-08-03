import React, { useState, useEffect } from 'react';
import { Sparkles, Search, Brain, MessageSquareText, Loader2, Check } from 'lucide-react';
import './ClaudeChatLoader.css';

export default function ClaudeChatLoader({ agentName = "Aura RAG Agent" }) {
  const [phase, setPhase] = useState(0); // 0: Searching, 1: Thinking, 2: Answering

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 1200);
    const timer2 = setTimeout(() => setPhase(2), 2600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const steps = [
    { label: 'Searching health knowledge base', icon: Search, detail: 'Querying ChromaDB vector storage for guidelines' },
    { label: 'Thinking & analyzing context', icon: Brain, detail: 'Synthesizing medical data & safety checks' },
    { label: 'Answering response', icon: MessageSquareText, detail: 'Drafting verified health advice' }
  ];

  const currentStep = steps[phase];

  return (
    <div className="claude-chat-loader-card animate-fade-in">
      <div className="claude-loader-header">
        <div className="claude-avatar-glow">
          <Sparkles size={16} className="claude-sparkle-icon" />
        </div>
        <div className="claude-agent-meta">
          <span className="claude-agent-name">{agentName}</span>
          <span className="claude-pulse-badge">
            <span className="pulse-dot"></span> Thinking...
          </span>
        </div>
      </div>

      <div className="claude-loader-body">
        {/* Animated Active Phase Box */}
        <div className="claude-active-phase">
          <div className="phase-icon-spin">
            <Loader2 size={16} className="spinning-loader" />
          </div>
          <div className="phase-text-container">
            <span className="phase-main-text">{currentStep.label}...</span>
            <span className="phase-sub-text">{currentStep.detail}</span>
          </div>
        </div>

        {/* Claude-style step pills indicator */}
        <div className="claude-steps-indicator">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < phase;
            const isActive = idx === phase;
            return (
              <div
                key={idx}
                className={`claude-step-pill ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
              >
                {isDone ? (
                  <Check size={12} className="step-check" />
                ) : isActive ? (
                  <Loader2 size={12} className="step-spinner" />
                ) : (
                  <Icon size={12} />
                )}
                <span>{idx === 0 ? 'Searching' : idx === 1 ? 'Thinking' : 'Answering'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
