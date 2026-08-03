import React, { useState } from 'react';
import { Brain, ChevronDown, Search, MessageSquareText } from 'lucide-react';
import './ClaudeChatLoader.css';

export default function ThinkingAccordion({ 
  sources = [], 
  thinkingTime = '1.4', 
  searchInfo, 
  thoughtInfo, 
  answerInfo 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const sourceCount = sources?.length || 0;

  return (
    <div className="claude-thinking-container">
      <button 
        type="button"
        className={`claude-thinking-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Click to toggle RAG reasoning process"
      >
        <div className="thinking-toggle-left">
          <Brain size={14} className="thinking-brain-icon" />
          <span className="thinking-title">Thought process</span>
          <span className="thinking-time-badge">{thinkingTime}s</span>
        </div>
        <div className="thinking-toggle-right">
          {sourceCount > 0 && (
            <span className="thinking-sources-count">{sourceCount} {sourceCount === 1 ? 'source' : 'sources'}</span>
          )}
          <ChevronDown size={14} className={`thinking-chevron ${isOpen ? 'rotated' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="claude-thinking-content animate-fade-in">
          <div className="thinking-step-item">
            <div className="thinking-step-header">
              <Search size={13} className="step-icon text-amber" />
              <span className="step-title">Searching</span>
            </div>
            <p className="step-desc">
              {searchInfo || `Queried ChromaDB vector repository and retrieved ${sourceCount} relevant health reference chunks.`}
            </p>
          </div>

          <div className="thinking-step-item">
            <div className="thinking-step-header">
              <Brain size={13} className="step-icon text-purple" />
              <span className="step-title">Thinking & Reasoning</span>
            </div>
            <p className="step-desc">
              {thoughtInfo || 'Analyzed user query, evaluated medical safety constraints, and verified health guidance guidelines.'}
            </p>
          </div>

          <div className="thinking-step-item">
            <div className="thinking-step-header">
              <MessageSquareText size={13} className="step-icon text-blue" />
              <span className="step-title">Answering</span>
            </div>
            <p className="step-desc">
              {answerInfo || 'Synthesized structured advice with source attributions.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
