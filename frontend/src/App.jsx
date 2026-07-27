import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  BookOpen,
  Calendar,
  ShieldCheck,
  Plus,
  Send,
  Trash2,
  ExternalLink,
  Sparkles,
  Info,
  Clock,
  User,
  HeartPulse,
  Database,
  CheckCircle,
  AlertCircle,
  Menu,
  X,
  LogIn,
  LogOut,
  Shield
} from 'lucide-react';
import './App.css';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'kb', 'booking', 'about'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // User & Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('aura_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleAuthSuccess = (userObj, msg) => {
    setCurrentUser(userObj);
    localStorage.setItem('aura_user', JSON.stringify(userObj));
    showToast('success', msg);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('aura_user');
    showToast('info', 'Signed out successfully');
  };

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello. I am your health information assistant. How can I help you today? You can ask about health conditions, preventive measures, or general medical guidance.',
      sources: []
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Knowledge base state (Admin URLs)
  const [urls, setUrls] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [category, setCategory] = useState('General Health');
  const [notes, setNotes] = useState('');
  const [isKbLoading, setIsKbLoading] = useState(false);

  // Booking state
  const [bookingForm, setBookingForm] = useState({
    alias_name: currentUser?.name || '',
    contact_info: currentUser?.email || '',
    counselor_type: 'General Health Advisor',
    preferred_date: '',
    preferred_time: '',
    notes: ''
  });
  const [existingBookings, setExistingBookings] = useState([]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  // Fetch data on tab switch
  useEffect(() => {
    if (activeTab === 'kb') {
      fetchUrls();
    } else if (activeTab === 'booking') {
      fetchBookings();
    }
  }, [activeTab]);

  const fetchUrls = async () => {
    setIsKbLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/urls`);
      if (res.ok) {
        const data = await res.json();
        setUrls(data.urls || []);
      }
    } catch (err) {
      console.log('Backend not reachable or running in offline mode:', err);
    } finally {
      setIsKbLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/bookings`);
      if (res.ok) {
        const data = await res.json();
        setExistingBookings(data.bookings || []);
      }
    } catch (err) {
      console.log('Bookings fetch offline:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isChatLoading) return;

    const userText = inputMessage.trim();
    const userMsgObj = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText
    };

    setMessages((prev) => [...prev, userMsgObj]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText, top_k: 3 })
      });

      if (!res.ok) {
        throw new Error('Server returned an error');
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.answer || 'No response received from service.',
          sources: data.sources || []
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'I am unable to reach the knowledge server right now. Please ensure the backend service is running at http://localhost:8001.\n\nFor reference, healthy lifestyle choices include balanced nutrition, regular physical activity, and routine health checkups.',
          sources: ['System Notice']
        }
      ]);
      showToast('error', 'Unable to reach backend chat server');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    if (currentUser?.role !== 'admin') {
      showToast('error', 'Admin permission required to index resources');
      return;
    }

    setIsKbLoading(true);

    try {
      const res = await fetch(`${API_BASE}/admin/add-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, category, notes })
      });

      if (res.ok) {
        showToast('success', 'Resource added and processed successfully');
        setNewUrl('');
        setNotes('');
        fetchUrls();
      } else {
        const errData = await res.json();
        showToast('error', errData.detail || 'Failed to process resource');
      }
    } catch (err) {
      showToast('error', 'Could not connect to server');
    } finally {
      setIsKbLoading(false);
    }
  };

  const handleDeleteUrl = async (urlToDelete) => {
    if (currentUser?.role !== 'admin') {
      showToast('error', 'Admin permission required to delete resources');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/urls?url=${encodeURIComponent(urlToDelete)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('success', 'Resource removed successfully');
        fetchUrls();
      }
    } catch (err) {
      showToast('error', 'Failed to delete URL');
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingForm)
      });

      if (res.ok) {
        const data = await res.json();
        const refCode = data.data?.booking_code || 'CONFIRMED';
        showToast('success', `Consultation requested! Reference: ${refCode}`);
        setBookingForm({
          alias_name: currentUser?.name || '',
          contact_info: currentUser?.email || '',
          counselor_type: 'General Health Advisor',
          preferred_date: '',
          preferred_time: '',
          notes: ''
        });
        fetchBookings();
      } else {
        showToast('error', 'Failed to complete booking request');
      }
    } catch (err) {
      showToast('error', 'Backend service offline');
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notification Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        API_BASE={API_BASE}
      />

      {/* Mobile Top Navigation Header */}
      <header className="mobile-top-bar">
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="brand-logo">
          <HeartPulse className="brand-icon" />
          <span className="brand-title">Aura Health</span>
        </div>

        {currentUser ? (
          <div className="user-avatar-circle" title={currentUser.name}>
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
        ) : (
          <button
            className="btn-sidebar-signin"
            style={{ margin: 0, padding: '4px 10px', width: 'auto', fontSize: '0.8rem' }}
            onClick={() => setIsAuthModalOpen(true)}
          >
            Sign In
          </button>
        )}
      </header>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            <HeartPulse className="brand-icon" />
            <span className="brand-title">Aura Health</span>
          </div>
        </div>

        {/* User / Admin Authentication State Pill */}
        {currentUser ? (
          <div className="user-profile-card">
            <div className="user-profile-info">
              <div className="user-avatar-circle">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-text-details">
                <span className="user-name-display">{currentUser.name}</span>
                <span className={`user-role-badge ${currentUser.role}`}>
                  {currentUser.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
            </div>
            <button onClick={handleSignOut} className="btn-signout-icon" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="btn-sidebar-signin" onClick={() => setIsAuthModalOpen(true)}>
            <LogIn size={16} />
            <span>Sign In / Register</span>
          </button>
        )}

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('chat');
              setIsMobileMenuOpen(false);
            }}
          >
            <MessageSquare className="nav-icon" />
            <span>Health Assistant</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'kb' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('kb');
              setIsMobileMenuOpen(false);
            }}
          >
            <BookOpen className="nav-icon" />
            <span>Knowledge Sources</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'booking' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('booking');
              setIsMobileMenuOpen(false);
            }}
          >
            <Calendar className="nav-icon" />
            <span>Counselor Consultation</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('about');
              setIsMobileMenuOpen(false);
            }}
          >
            <Info className="nav-icon" />
            <span>About Platform</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="privacy-badge">
            <ShieldCheck className="privacy-icon" />
            <span>Private & Confidential</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Chat Section */}
        {activeTab === 'chat' && (
          <section className="chat-section animate-fade-in">
            <header className="content-header">
              <h2>Health Assistant</h2>
              <p className="header-subtitle">
                Evidence-informed health insights powered by curated medical knowledge repositories.
              </p>
            </header>

            <div className="chat-messages-container">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-row ${msg.sender}`}>
                  <div className="message-avatar">
                    {msg.sender === 'user' ? (
                      <User size={18} />
                    ) : (
                      <Sparkles size={18} className="ai-icon" />
                    )}
                  </div>
                  <div className="message-content">
                    <div className="message-sender-name">
                      {msg.sender === 'user' ? (currentUser?.name || 'You') : 'Aura Assistant'}
                    </div>
                    <div className="message-text">{msg.text}</div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="message-sources">
                        <span className="sources-label">Sources:</span>
                        {msg.sources.map((src, i) => (
                          <span key={i} className="source-tag">
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="message-row assistant">
                  <div className="message-avatar">
                    <Sparkles size={18} className="ai-icon" />
                  </div>
                  <div className="message-content">
                    <div className="message-sender-name">Aura Assistant</div>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-wrapper">
              <form onSubmit={handleSendMessage} className="chat-input-box">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask a medical or health question..."
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isChatLoading}
                  className="send-button"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
              <div className="input-disclaimer">
                Aura Assistant provides general information and does not replace professional diagnosis or care.
              </div>
            </div>
          </section>
        )}

        {/* Knowledge Base Section */}
        {activeTab === 'kb' && (
          <section className="kb-section animate-fade-in">
            <header className="content-header">
              <h2>Knowledge Sources</h2>
              <p className="header-subtitle">
                Manage verified web resources and health documentation indexed into the system.
              </p>
            </header>

            <div className="section-grid">
              <div className="card add-source-card">
                <h3>Add Verified Resource</h3>
                
                {currentUser?.role !== 'admin' && (
                  <div className="admin-only-banner">
                    💡 <strong>User Mode:</strong> You are viewing indexed sources. Sign in as <strong>Admin</strong> to add or delete knowledge base URLs.
                  </div>
                )}

                <form onSubmit={handleAddUrl} className="form-stack">
                  <div className="form-group">
                    <label>Resource URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://example.org/medical-guidelines"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      disabled={currentUser?.role !== 'admin'}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={currentUser?.role !== 'admin'}
                      >
                        <option value="General Health">General Health</option>
                        <option value="Mental Health">Mental Health</option>
                        <option value="Nutrition">Nutrition</option>
                        <option value="Preventive Care">Preventive Care</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Notes / Context</label>
                      <input
                        type="text"
                        placeholder="Optional details"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={currentUser?.role !== 'admin'}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isKbLoading || currentUser?.role !== 'admin'}
                    className="btn-primary"
                  >
                    <Plus size={16} />
                    <span>Add Resource & Index</span>
                  </button>
                </form>
              </div>

              <div className="card indexed-sources-card">
                <h3>Indexed Document Sources</h3>
                {isKbLoading && urls.length === 0 ? (
                  <p className="empty-state">Loading sources...</p>
                ) : urls.length === 0 ? (
                  <div className="empty-state">
                    <Database size={32} />
                    <p>No external sources registered yet.</p>
                  </div>
                ) : (
                  <div className="url-list">
                    {urls.map((item, index) => (
                      <div key={index} className="url-item">
                        <div className="url-details">
                          <span className="url-link">{item.url}</span>
                          <div className="url-tags">
                            <span className="badge">{item.category || 'General'}</span>
                            {item.notes && <span className="notes">{item.notes}</span>}
                          </div>
                        </div>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteUrl(item.url)}
                            className="btn-icon danger"
                            title="Remove Source"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Counseling & Booking Section */}
        {activeTab === 'booking' && (
          <section className="booking-section animate-fade-in">
            <header className="content-header">
              <h2>Counselor Consultation</h2>
              <p className="header-subtitle">
                Schedule confidential sessions with certified health counselors.
              </p>
            </header>

            <div className="section-grid">
              <div className="card booking-form-card">
                <h3>Request Consultation</h3>
                <form onSubmit={handleCreateBooking} className="form-stack">
                  <div className="form-group">
                    <label>Preferred Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex M."
                      value={bookingForm.alias_name}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, alias_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Information (Email / Phone)</label>
                    <input
                      type="text"
                      required
                      placeholder="contact@example.com"
                      value={bookingForm.contact_info}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, contact_info: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Specialist Type</label>
                    <select
                      value={bookingForm.counselor_type}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, counselor_type: e.target.value })
                      }
                    >
                      <option value="General Health Advisor">General Health Advisor</option>
                      <option value="Mental Wellness Counselor">Mental Wellness Counselor</option>
                      <option value="Nutritionist">Nutritionist</option>
                      <option value="Chronic Condition Specialist">Chronic Condition Specialist</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Preferred Date</label>
                      <input
                        type="date"
                        required
                        value={bookingForm.preferred_date}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, preferred_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Preferred Time</label>
                      <input
                        type="time"
                        required
                        value={bookingForm.preferred_time}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, preferred_time: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Brief Topic or Questions</label>
                    <textarea
                      rows={2}
                      placeholder="Describe what you would like to discuss..."
                      value={bookingForm.notes}
                      onChange={(e) =>
                        setBookingForm({ ...bookingForm, notes: e.target.value })
                      }
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    <Calendar size={16} />
                    <span>Submit Consultation Request</span>
                  </button>
                </form>
              </div>

              <div className="card appointments-card">
                <h3>Scheduled Requests</h3>
                {existingBookings.length === 0 ? (
                  <div className="empty-state">
                    <Clock size={32} />
                    <p>No active consultation requests found.</p>
                  </div>
                ) : (
                  <div className="booking-list">
                    {existingBookings.map((b, i) => (
                      <div key={i} className="booking-item">
                        <div className="booking-header">
                          <span className="alias">{b.alias_name}</span>
                          <span className={`status-tag ${b.status?.toLowerCase()}`}>
                            {b.status || 'Pending'}
                          </span>
                        </div>
                        <div className="booking-meta">
                          <span>{b.counselor_type}</span> &bull;{' '}
                          <span>{b.preferred_date} at {b.preferred_time}</span>
                        </div>
                        {b.booking_code && (
                          <div className="code">Code: {b.booking_code}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* About Section */}
        {activeTab === 'about' && (
          <section className="about-section animate-fade-in">
            <header className="content-header">
              <h2>About Aura Health</h2>
              <p className="header-subtitle">
                An intelligent health awareness and guidance application.
              </p>
            </header>

            <div className="about-card card">
              <div className="about-block">
                <h3>Purpose & Architecture</h3>
                <p>
                  Aura Health provides accessible, reliable health information and counselor booking. The system leverages retrieval-augmented synthesis over vetted medical guidelines to answer queries accurately while preserving privacy.
                </p>
              </div>

              <div className="about-grid">
                <div className="feature-box">
                  <ShieldCheck className="feature-icon" />
                  <h4>Confidentiality</h4>
                  <p>Designed to minimize identity tracking and support anonymous counselor booking aliases.</p>
                </div>

                <div className="feature-box">
                  <Database className="feature-icon" />
                  <h4>Curated Knowledge</h4>
                  <p>Answers are grounded in indexed healthcare documents rather than unverified sources.</p>
                </div>

                <div className="feature-box">
                  <HeartPulse className="feature-icon" />
                  <h4>Human Expertise</h4>
                  <p>Direct scheduling bridges automated insights with certified medical specialists.</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
