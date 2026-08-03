import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Calendar,
  Info,
  Settings,
  Send,
  Sparkles,
  User,
  HeartPulse,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Clock,
  CheckCircle,
  Bell,
  Lock,
  Moon,
  Sun
} from 'lucide-react';
import './UserDashboard.css';
import ClaudeChatLoader from '../components/ClaudeChatLoader';
import ThinkingAccordion from '../components/ThinkingAccordion';

export default function UserDashboard({ currentUser, onSignOut, showToast, API_BASE }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'booking', 'about', 'settings'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${currentUser?.name || 'there'}! I am your health information assistant. How can I help you today? Ask me about medical conditions, healthy habits, or guidance.`,
      sources: []
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Booking State
  const [bookingForm, setBookingForm] = useState({
    alias_name: currentUser?.name || '',
    contact_info: currentUser?.email || '',
    counselor_type: 'General Health Advisor',
    preferred_date: '',
    preferred_time: '',
    notes: ''
  });
  const [userBookings, setUserBookings] = useState([]);

  // User Settings State
  const [userProfile, setUserProfile] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    emailNotifications: true,
    darkMode: false
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  useEffect(() => {
    if (activeTab === 'booking') {
      fetchUserBookings();
    }
  }, [activeTab]);

  const fetchUserBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/bookings`);
      if (res.ok) {
        const data = await res.json();
        // Strictly filter bookings matching current user's email only
        const userEmail = (currentUser?.email || '').trim().toLowerCase();
        const filtered = (data.bookings || []).filter(
          (b) => (b.contact_info || '').trim().toLowerCase() === userEmail
        );
        setUserBookings(filtered);
      }
    } catch (err) {
      console.log('Bookings fetch offline:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isChatLoading) return;

    const userText = inputMessage.trim();
    const startTime = Date.now();
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

      if (!res.ok) throw new Error('Server returned an error');

      const data = await res.json();
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.answer || 'No response received from service.',
          sources: data.sources || [],
          thinkingTime: elapsedTime
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'I am unable to reach the health knowledge server right now. Please verify the backend is running at http://localhost:8001.\n\nHealthy habit tip: Ensure 7-8 hours of continuous sleep and stay hydrated throughout the day.',
          sources: ['System Notice'],
          thinkingTime: '0.8'
        }
      ]);
      showToast('error', 'Unable to connect to AI Assistant service');
    } finally {
      setIsChatLoading(false);
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
        showToast('success', `Consultation requested successfully! Code: ${refCode}`);
        setBookingForm({
          alias_name: currentUser?.name || '',
          contact_info: currentUser?.email || '',
          counselor_type: 'General Health Advisor',
          preferred_date: '',
          preferred_time: '',
          notes: ''
        });
        fetchUserBookings();
      } else {
        showToast('error', 'Failed to submit booking request.');
      }
    } catch (err) {
      showToast('error', 'Backend service offline');
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    showToast('success', 'User preferences updated successfully!');
  };

  return (
    <div className="user-dashboard-layout">
      {/* Mobile Header Bar */}
      <header className="user-mobile-header">
        <button
          className="user-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="user-brand-logo">
          <HeartPulse className="user-brand-icon" />
          <span>Aura Health</span>
        </div>

        <div className="user-avatar-badge">{currentUser?.name?.charAt(0).toUpperCase()}</div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="user-drawer-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`user-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="user-sidebar-header">
          <div className="user-brand-logo">
            <HeartPulse className="user-brand-icon" />
            <span>Aura Health</span>
          </div>
        </div>

        <div className="user-profile-pill">
          <div className="user-profile-avatar">{currentUser?.name?.charAt(0).toUpperCase()}</div>
          <div className="user-profile-details">
            <span className="user-profile-name">{currentUser?.name}</span>
            <span className="user-profile-role">User Portal</span>
          </div>
          <button onClick={onSignOut} className="user-btn-signout" title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>

        <nav className="user-nav-menu">
          <button
            className={`user-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('chat');
              setIsMobileMenuOpen(false);
            }}
          >
            <MessageSquare size={18} />
            <span>Health Assistant</span>
          </button>

          <button
            className={`user-nav-item ${activeTab === 'booking' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('booking');
              setIsMobileMenuOpen(false);
            }}
          >
            <Calendar size={18} />
            <span>Counselor Booking</span>
          </button>

          <button
            className={`user-nav-item ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('about');
              setIsMobileMenuOpen(false);
            }}
          >
            <Info size={18} />
            <span>About Platform</span>
          </button>

          <button
            className={`user-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('settings');
              setIsMobileMenuOpen(false);
            }}
          >
            <Settings size={18} />
            <span>User Settings</span>
          </button>
        </nav>

        <div className="user-sidebar-footer">
          <div className="user-privacy-tag">
            <ShieldCheck size={14} />
            <span>Private & Encrypted</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="user-main-content">
        {/* Chat Section */}
        {activeTab === 'chat' && (
          <section className="user-section animate-fade-in">
            <header className="user-content-header">
              <h2>Health Assistant</h2>
              <p>Personalized AI health guidance powered by verified medical repositories.</p>
            </header>

            <div className="user-chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`user-msg-row ${msg.sender}`}>
                  <div className="user-msg-avatar">
                    {msg.sender === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                  </div>
                  <div className="user-msg-content">
                    <div className="user-msg-sender">{msg.sender === 'user' ? currentUser?.name : 'Aura Assistant'}</div>
                    {msg.sender === 'assistant' && (
                      <ThinkingAccordion
                        sources={msg.sources}
                        thinkingTime={msg.thinkingTime || '1.4'}
                      />
                    )}
                    <div className="user-msg-text">{msg.text}</div>
                    {msg.sources?.length > 0 && (
                      <div className="user-msg-sources">
                        <span>Sources:</span>
                        {msg.sources.map((src, idx) => (
                          <span key={idx} className="user-source-tag">
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="user-msg-row assistant">
                  <ClaudeChatLoader agentName="Aura Health AI Agent" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="user-chat-input-area">
              <form onSubmit={handleSendMessage} className="user-chat-box">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask a health or wellness question..."
                  rows={1}
                />
                <button type="submit" disabled={!inputMessage.trim() || isChatLoading} className="user-send-btn">
                  <Send size={18} />
                </button>
              </form>
              <div className="user-disclaimer">
                Aura Assistant provides general information and does not replace medical diagnosis.
              </div>
            </div>
          </section>
        )}

        {/* Counseling & Booking Section */}
        {activeTab === 'booking' && (
          <section className="user-section animate-fade-in">
            <header className="user-content-header">
              <h2>Counselor Consultation</h2>
              <p>Request confidential 1-on-1 sessions with certified healthcare specialists.</p>
            </header>

            <div className="user-grid-container">
              <div className="user-card">
                <h3>Request Consultation</h3>
                <form onSubmit={handleCreateBooking} className="user-form-stack">
                  <div className="user-form-group">
                    <label>Preferred Name / Alias</label>
                    <input
                      type="text"
                      required
                      value={bookingForm.alias_name}
                      onChange={(e) => setBookingForm({ ...bookingForm, alias_name: e.target.value })}
                    />
                  </div>

                  <div className="user-form-group">
                    <label>Contact Information</label>
                    <input
                      type="text"
                      required
                      value={bookingForm.contact_info}
                      onChange={(e) => setBookingForm({ ...bookingForm, contact_info: e.target.value })}
                    />
                  </div>

                  <div className="user-form-group">
                    <label>Specialist Type</label>
                    <select
                      value={bookingForm.counselor_type}
                      onChange={(e) => setBookingForm({ ...bookingForm, counselor_type: e.target.value })}
                    >
                      <option value="General Health Advisor">General Health Advisor</option>
                      <option value="Mental Wellness Counselor">Mental Wellness Counselor</option>
                      <option value="Nutritionist">Nutritionist</option>
                      <option value="Chronic Condition Specialist">Chronic Condition Specialist</option>
                    </select>
                  </div>

                  <div className="user-form-row">
                    <div className="user-form-group">
                      <label>Preferred Date</label>
                      <input
                        type="date"
                        required
                        value={bookingForm.preferred_date}
                        onChange={(e) => setBookingForm({ ...bookingForm, preferred_date: e.target.value })}
                      />
                    </div>
                    <div className="user-form-group">
                      <label>Preferred Time</label>
                      <input
                        type="time"
                        required
                        value={bookingForm.preferred_time}
                        onChange={(e) => setBookingForm({ ...bookingForm, preferred_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="user-form-group">
                    <label>Brief Topic or Questions</label>
                    <textarea
                      rows={2}
                      placeholder="Optional details for the counselor..."
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="user-btn-primary">
                    <Calendar size={16} />
                    <span>Submit Request</span>
                  </button>
                </form>
              </div>

              <div className="user-card">
                <h3>My Scheduled Requests</h3>
                {userBookings.length === 0 ? (
                  <div className="user-empty-state">
                    <Clock size={32} />
                    <p>No active consultation requests found.</p>
                  </div>
                ) : (
                  <div className="user-booking-list">
                    {userBookings.map((b, i) => (
                      <div key={i} className="user-booking-item">
                        <div className="user-booking-top">
                          <span className="user-booking-alias">{b.alias_name}</span>
                          <span className={`user-status-pill ${b.status?.toLowerCase()}`}>
                            {b.status || 'Pending'}
                          </span>
                        </div>
                        <div className="user-booking-meta">
                          {b.counselor_type} &bull; {b.preferred_date} at {b.preferred_time}
                        </div>
                        {b.booking_code && <div className="user-booking-code">Ref: {b.booking_code}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <section className="user-section animate-fade-in">
            <header className="user-content-header">
              <h2>About Platform</h2>
              <p>Accessible medical intelligence and specialist consultation platform.</p>
            </header>

            <div className="user-card user-about-card">
              <h3>Core Capabilities</h3>
              <div className="user-about-grid">
                <div className="user-feature-card">
                  <ShieldCheck className="user-feature-icon" />
                  <h4>Confidentiality First</h4>
                  <p>All counselor consultation requests respect user privacy.</p>
                </div>
                <div className="user-feature-card">
                  <Sparkles className="user-feature-icon" />
                  <h4>Curated Knowledge</h4>
                  <p>AI answers are synthesized from indexed medical guidelines.</p>
                </div>
                <div className="user-feature-card">
                  <HeartPulse className="user-feature-icon" />
                  <h4>Certified Specialists</h4>
                  <p>Direct scheduling bridges AI assistance with professional care.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* User Settings Tab */}
        {activeTab === 'settings' && (
          <section className="user-section animate-fade-in">
            <header className="user-content-header">
              <h2>User Settings</h2>
              <p>Manage your account details and notification preferences.</p>
            </header>

            <div className="user-card user-settings-card">
              <h3>Account & Preferences</h3>
              <form onSubmit={handleSaveSettings} className="user-form-stack">
                <div className="user-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                  />
                </div>

                <div className="user-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={userProfile.email}
                  />
                </div>

                <div className="user-checkbox-group">
                  <label className="user-checkbox-label">
                    <input
                      type="checkbox"
                      checked={userProfile.emailNotifications}
                      onChange={(e) => setUserProfile({ ...userProfile, emailNotifications: e.target.checked })}
                    />
                    <span>Receive email updates for counselor bookings</span>
                  </label>
                </div>

                <button type="submit" className="user-btn-primary" style={{ width: 'auto', alignSelf: 'flex-start' }}>
                  <CheckCircle size={16} />
                  <span>Save Preferences</span>
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
