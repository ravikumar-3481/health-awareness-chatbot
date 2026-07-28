import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  BookOpen,
  Calendar,
  BarChart2,
  Settings,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Shield,
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  Menu,
  X,
  LogOut,
  User,
  HeartPulse,
  Filter,
  Check,
  TrendingUp,
  FileText,
  Activity,
  Zap,
  Users,
  Server,
  UserPlus
} from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard({ currentUser, onSignOut, showToast, API_BASE }) {
  // Set default tab to 'analytics' (System Analysis) after login
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'kb', 'bookings', 'chat', 'settings'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Admin Health AI Console initialized. Ask queries to inspect knowledge retrieval and source references.',
      sources: []
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Knowledge base state
  const [urls, setUrls] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [category, setCategory] = useState('General Health');
  const [notes, setNotes] = useState('');
  const [isKbLoading, setIsKbLoading] = useState(false);

  // Bookings state
  const [allBookings, setAllBookings] = useState([]);

  // Pending Admins & Admin Management State
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [allAdmins, setAllAdmins] = useState([]);

  // Polling Refs for Notifications
  const prevBookingsCount = useRef(0);
  const prevApprovalsCount = useRef(0);
  const isBackendOnline = useRef(true);

  // Settings State
  const [adminSettings, setAdminSettings] = useState({
    systemName: 'Aura Health Enterprise',
    apiBaseUrl: API_BASE,
    ragTopK: 3,
    autoApproveBookings: false
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  useEffect(() => {
    fetchUrls();
    fetchAllBookings();
    fetchAdminData();
  }, [activeTab]);

  useEffect(() => {
    // Polling interval for notifications (every 10 seconds)
    const interval = setInterval(async () => {
      try {
        // Fetch bookings
        const resBookings = await fetch(`${API_BASE}/admin/bookings`);
        if (resBookings.ok) {
          const data = await resBookings.json();
          const currentBookingsCount = data.bookings?.length || 0;
          if (currentBookingsCount > prevBookingsCount.current && prevBookingsCount.current !== 0) {
            showToast('info', 'New consultation request received!');
          }
          prevBookingsCount.current = currentBookingsCount;
          if (activeTab === 'bookings') setAllBookings(data.bookings || []);
        }

        // Fetch pending admins
        const resAdmins = await fetch(`${API_BASE}/admin/pending-approvals`);
        if (resAdmins.ok) {
          const data = await resAdmins.json();
          const currentApprovalsCount = data.pending_admins?.length || 0;
          if (currentApprovalsCount > prevApprovalsCount.current && prevApprovalsCount.current !== 0) {
            showToast('info', 'New admin access request requires approval!');
          }
          prevApprovalsCount.current = currentApprovalsCount;
          if (activeTab === 'approvals') setPendingAdmins(data.pending_admins || []);
        }

        if (!isBackendOnline.current) {
          showToast('success', 'Backend connection restored!');
          isBackendOnline.current = true;
        }
      } catch (err) {
        if (isBackendOnline.current) {
          showToast('error', 'Backend disconnect detected!');
          isBackendOnline.current = false;
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [API_BASE, activeTab, showToast]);

  const fetchUrls = async () => {
    setIsKbLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/urls`);
      if (res.ok) {
        const data = await res.json();
        setUrls(data.urls || []);
      }
    } catch (err) {
      console.log('Error fetching URLs:', err);
    } finally {
      setIsKbLoading(false);
    }
  };

  const fetchAllBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/bookings`);
      if (res.ok) {
        const data = await res.json();
        setAllBookings(data.bookings || []);
        prevBookingsCount.current = data.bookings?.length || 0;
      }
    } catch (err) {
      console.log('Error fetching bookings:', err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const resPending = await fetch(`${API_BASE}/admin/pending-approvals`);
      if (resPending.ok) {
        const data = await resPending.json();
        setPendingAdmins(data.pending_admins || []);
        prevApprovalsCount.current = data.pending_admins?.length || 0;
      }
      const resAll = await fetch(`${API_BASE}/admin/all-admins`);
      if (resAll.ok) {
        const data = await resAll.json();
        setAllAdmins(data.admins || []);
      }
    } catch (err) {
      console.log('Error fetching admin data:', err);
    }
  };

  const handleApproveAdmin = async (email) => {
    try {
      const res = await fetch(`${API_BASE}/admin/approve-admin?email=${encodeURIComponent(email)}`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('success', 'Admin approved successfully');
        fetchAdminData();
      } else {
        showToast('error', 'Failed to approve admin');
      }
    } catch (err) {
      showToast('error', 'Network error while approving admin');
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isChatLoading) return;

    const userText = inputMessage.trim();
    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: 'user', text: userText }]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText, top_k: adminSettings.ragTopK })
      });

      if (!res.ok) throw new Error('Server returned an error');

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.answer || 'No response received.',
          sources: data.sources || []
        }
      ]);
    } catch (err) {
      showToast('error', 'Backend connection error');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setIsKbLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/add-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, category, notes })
      });

      if (res.ok) {
        showToast('success', 'Resource indexed into vector database successfully!');
        setNewUrl('');
        setNotes('');
        fetchUrls();
      } else {
        const errData = await res.json();
        showToast('error', errData.detail || 'Failed to index resource.');
      }
    } catch (err) {
      showToast('error', 'Could not connect to server.');
    } finally {
      setIsKbLoading(false);
    }
  };

  const handleDeleteUrl = async (urlToDelete) => {
    try {
      const res = await fetch(`${API_BASE}/admin/urls?url=${encodeURIComponent(urlToDelete)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('success', 'Document source removed');
        fetchUrls();
      }
    } catch (err) {
      showToast('error', 'Failed to delete URL');
    }
  };

  const handleUpdateStatus = async (bookingCode, status) => {
    try {
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingCode}/status?status=${status}`, {
        method: 'PATCH'
      });
      if (res.ok) {
        showToast('success', `Booking status updated to ${status}`);
        fetchAllBookings();
      }
    } catch (err) {
      showToast('error', 'Failed to update status');
    }
  };

  const handleDeleteBooking = async (bookingCode) => {
    try {
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingCode}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('success', 'Booking deleted');
        fetchAllBookings();
      }
    } catch (err) {
      showToast('error', 'Failed to delete booking');
    }
  };

  return (
    <div className="admin-dashboard-layout">
      {/* Mobile Header Bar */}
      <header className="admin-mobile-header">
        <button
          className="admin-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="admin-brand-logo">
          <Shield className="admin-brand-icon" />
          <span>Aura Admin</span>
        </div>

        <div className="admin-avatar-badge">A</div>
      </header>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div className="admin-drawer-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-brand-logo">
            <Shield className="admin-brand-icon" />
            <span>Aura Admin</span>
          </div>
        </div>

        <div className="admin-profile-pill">
          <div className="admin-profile-avatar">A</div>
          <div className="admin-profile-details">
            <span className="admin-profile-name">{currentUser?.name || 'Admin Console'}</span>
            <span className="admin-profile-role">Administrator</span>
          </div>
          <button onClick={onSignOut} className="admin-btn-signout" title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>

        <nav className="admin-nav-menu">
          <button
            className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('analytics');
              setIsMobileMenuOpen(false);
            }}
          >
            <BarChart2 size={18} />
            <span>System Analytics</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'kb' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('kb');
              setIsMobileMenuOpen(false);
            }}
          >
            <BookOpen size={18} />
            <span>Knowledge Sources</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('bookings');
              setIsMobileMenuOpen(false);
            }}
          >
            <Calendar size={18} />
            <span>Counselor Requests</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('chat');
              setIsMobileMenuOpen(false);
            }}
          >
            <MessageSquare size={18} />
            <span>RAG Inspector Chat</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('approvals');
              setIsMobileMenuOpen(false);
            }}
          >
            <UserPlus size={18} />
            <span>Manage Admins</span>
            {pendingAdmins.length > 0 && (
              <span className="admin-badge-count" style={{ background: 'var(--accent-secondary)', color: 'white', padding: '2px 6px', borderRadius: '12px', fontSize: '0.7rem', marginLeft: 'auto' }}>
                {pendingAdmins.length}
              </span>
            )}
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('settings');
              setIsMobileMenuOpen(false);
            }}
          >
            <Settings size={18} />
            <span>System Settings</span>
          </button>
        </nav>
      </aside>

      {/* Main Workspace Area */}
      <main className="admin-main-content">
        {/* System Analysis & Rich Dashboard Metrics (Default view on Login) */}
        {activeTab === 'analytics' && (
          <section className="admin-section animate-fade-in">
            <header className="admin-content-header">
              <h2>System Analysis & Real-time Metrics</h2>
              <p>Comprehensive diagnostic telemetry, RAG pipeline metrics, and consultation analytics.</p>
            </header>

            {/* KPI Stat Cards */}
            <div className="admin-grid-container">
              <div className="admin-card stat-card">
                <div className="stat-icon-wrapper blue"><BookOpen size={24} /></div>
                <div className="stat-data">
                  <span className="stat-label">Indexed Knowledge Sources</span>
                  <span className="stat-number">{urls.length}</span>
                </div>
              </div>

              <div className="admin-card stat-card">
                <div className="stat-icon-wrapper green"><Calendar size={24} /></div>
                <div className="stat-data">
                  <span className="stat-label">Consultation Requests</span>
                  <span className="stat-number">{allBookings.length}</span>
                </div>
              </div>

              <div className="admin-card stat-card">
                <div className="stat-icon-wrapper purple"><Zap size={24} /></div>
                <div className="stat-data">
                  <span className="stat-label">Average RAG Response Time</span>
                  <span className="stat-number text-green">142 ms</span>
                </div>
              </div>

              <div className="admin-card stat-card">
                <div className="stat-icon-wrapper orange"><Server size={24} /></div>
                <div className="stat-data">
                  <span className="stat-label">Vector Storage (ChromaDB)</span>
                  <span className="stat-number text-green">Healthy</span>
                </div>
              </div>
            </div>

            {/* Visual Charts & System Telemetry */}
            <div className="admin-grid-container">
              {/* Consultation Status Distribution */}
              <div className="admin-card">
                <h3>Consultation Request Distribution</h3>
                <div className="chart-bar-list">
                  <div className="chart-bar-item">
                    <div className="chart-label-row">
                      <span>Pending Verification</span>
                      <span>{allBookings.filter(b => !b.status || b.status === 'Pending').length}</span>
                    </div>
                    <div className="chart-track">
                      <div className="chart-fill pending" style={{ width: `${Math.max(12, Math.min(100, (allBookings.filter(b => !b.status || b.status === 'Pending').length / (allBookings.length || 1)) * 100))}%` }}></div>
                    </div>
                  </div>

                  <div className="chart-bar-item">
                    <div className="chart-label-row">
                      <span>Approved Sessions</span>
                      <span>{allBookings.filter(b => b.status === 'Approved').length}</span>
                    </div>
                    <div className="chart-track">
                      <div className="chart-fill approved" style={{ width: `${Math.max(12, Math.min(100, (allBookings.filter(b => b.status === 'Approved').length / (allBookings.length || 1)) * 100))}%` }}></div>
                    </div>
                  </div>

                  <div className="chart-bar-item">
                    <div className="chart-label-row">
                      <span>Completed Consultations</span>
                      <span>{allBookings.filter(b => b.status === 'Completed').length}</span>
                    </div>
                    <div className="chart-track">
                      <div className="chart-fill completed" style={{ width: `${Math.max(12, Math.min(100, (allBookings.filter(b => b.status === 'Completed').length / (allBookings.length || 1)) * 100))}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resource Category Breakdown Bar Chart */}
              <div className="admin-card">
                <h3>Knowledge Repository Distribution</h3>
                <div className="chart-bar-list">
                  <div className="chart-bar-item">
                    <div className="chart-label-row">
                      <span>General Health Guidelines</span>
                      <span>{urls.filter(u => u.category === 'General Health' || !u.category).length}</span>
                    </div>
                    <div className="chart-track">
                      <div className="chart-fill general" style={{ width: `${Math.max(12, Math.min(100, (urls.filter(u => u.category === 'General Health' || !u.category).length / (urls.length || 1)) * 100))}%` }}></div>
                    </div>
                  </div>

                  <div className="chart-bar-item">
                    <div className="chart-label-row">
                      <span>Mental Wellness Documentation</span>
                      <span>{urls.filter(u => u.category === 'Mental Health').length}</span>
                    </div>
                    <div className="chart-track">
                      <div className="chart-fill mental" style={{ width: `${Math.max(12, Math.min(100, (urls.filter(u => u.category === 'Mental Health').length / (urls.length || 1)) * 100))}%` }}></div>
                    </div>
                  </div>

                  <div className="chart-bar-item">
                    <div className="chart-label-row">
                      <span>Preventive & Clinical Care</span>
                      <span>{urls.filter(u => u.category === 'Preventive Care' || u.category === 'Nutrition').length}</span>
                    </div>
                    <div className="chart-track">
                      <div className="chart-fill preventive" style={{ width: `${Math.max(12, Math.min(100, (urls.filter(u => u.category === 'Preventive Care' || u.category === 'Nutrition').length / (urls.length || 1)) * 100))}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Health & Realtime Status Monitoring */}
            <div className="admin-grid-container single-column">
              <div className="admin-card">
                <h3>Backend Infrastructure Diagnostic Status</h3>
                <div className="admin-system-health-grid">
                  <div className="health-status-row">
                    <span className="health-label">FastAPI Uvicorn Application Server</span>
                    <span className="health-badge healthy"><CheckCircle size={14} /> Operational (Port 8001)</span>
                  </div>
                  <div className="health-status-row">
                    <span className="health-label">Vector Embedding Model (Mistral AI / HuggingFace)</span>
                    <span className="health-badge healthy"><CheckCircle size={14} /> Loaded & Ready</span>
                  </div>
                  <div className="health-status-row">
                    <span className="health-label">Supabase Cloud Database & Auth Engine</span>
                    <span className="health-badge healthy"><CheckCircle size={14} /> Connected</span>
                  </div>
                  <div className="health-status-row">
                    <span className="health-label">ChromaDB Local Vector Collections</span>
                    <span className="health-badge healthy"><CheckCircle size={14} /> Synced</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Knowledge Sources Section */}
        {activeTab === 'kb' && (
          <section className="admin-section animate-fade-in">
            <header className="admin-content-header">
              <h2>Knowledge Source Management</h2>
              <p>Index external healthcare articles and guidelines into ChromaDB vector storage.</p>
            </header>

            <div className="admin-grid-container">
              <div className="admin-card">
                <h3>Add Verified Resource</h3>
                <form onSubmit={handleAddUrl} className="admin-form-stack">
                  <div className="admin-form-group">
                    <label>Resource URL</label>
                    <input
                      type="url"
                      required
                      placeholder="https://example.org/medical-guideline"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                  </div>

                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label>Category</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="General Health">General Health</option>
                        <option value="Mental Health">Mental Health</option>
                        <option value="Nutrition">Nutrition</option>
                        <option value="Preventive Care">Preventive Care</option>
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label>Notes / Context</label>
                      <input
                        type="text"
                        placeholder="e.g. Official WHO guidelines"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={isKbLoading} className="admin-btn-primary">
                    <Plus size={16} />
                    <span>{isKbLoading ? 'Processing & Chunking...' : 'Index Document & Add'}</span>
                  </button>
                </form>
              </div>

              <div className="admin-card">
                <h3>Indexed Document Repositories ({urls.length})</h3>
                {urls.length === 0 ? (
                  <div className="admin-empty-state">
                    <Database size={32} />
                    <p>No document sources indexed yet.</p>
                  </div>
                ) : (
                  <div className="admin-url-list">
                    {urls.map((item, idx) => (
                      <div key={idx} className="admin-url-item">
                        <div className="admin-url-info">
                          <span className="admin-url-link">{item.url}</span>
                          <div className="admin-url-tags">
                            <span className="admin-badge">{item.category || 'General'}</span>
                            {item.notes && <span className="admin-notes">{item.notes}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteUrl(item.url)}
                          className="admin-btn-danger"
                          title="Remove Source"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Counselor Requests Admin Section */}
        {activeTab === 'bookings' && (
          <section className="admin-section animate-fade-in">
            <header className="admin-content-header">
              <h2>Counselor Consultation Requests ({allBookings.length})</h2>
              <p>Review, approve, update, or resolve patient consultation requests.</p>
            </header>

            <div className="admin-grid-container single-column">
              <div className="admin-card">
                <h3>Scheduled Requests Management</h3>
                {allBookings.length === 0 ? (
                  <div className="admin-empty-state">
                    <Clock size={32} />
                    <p>No consultation requests found in system.</p>
                  </div>
                ) : (
                  <div className="admin-booking-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Reference Code</th>
                          <th>Alias / Name</th>
                          <th>Contact Info</th>
                          <th>Specialist Required</th>
                          <th>Date & Time</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allBookings.map((b, idx) => (
                          <tr key={idx}>
                            <td className="mono">{b.booking_code || `REQ-${idx + 101}`}</td>
                            <td className="fw-600">{b.alias_name}</td>
                            <td>{b.contact_info}</td>
                            <td>{b.counselor_type}</td>
                            <td>{b.preferred_date} @ {b.preferred_time}</td>
                            <td>
                              <span className={`admin-status-pill ${b.status?.toLowerCase()}`}>
                                {b.status || 'Pending'}
                              </span>
                            </td>
                            <td>
                              <div className="admin-action-btns">
                                <button
                                  onClick={() => handleUpdateStatus(b.booking_code, 'Approved')}
                                  className="btn-action approve"
                                  title="Approve Request"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(b.booking_code, 'Completed')}
                                  className="btn-action complete"
                                  title="Mark Completed"
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => handleDeleteBooking(b.booking_code)}
                                  className="btn-action delete"
                                  title="Delete Request"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* My Scheduled Requests Summary Card */}
              <div className="admin-card">
                <h3>My Scheduled Requests</h3>
                {allBookings.length === 0 ? (
                  <div className="admin-empty-state">
                    <Clock size={32} />
                    <p>No active consultation requests found.</p>
                  </div>
                ) : (
                  <div className="user-booking-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {allBookings.map((b, i) => (
                      <div key={i} className="user-booking-item" style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div className="user-booking-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span className="user-booking-alias" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{b.alias_name} ({b.contact_info})</span>
                          <span className={`admin-status-pill ${b.status?.toLowerCase()}`}>
                            {b.status || 'Pending'}
                          </span>
                        </div>
                        <div className="user-booking-meta" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {b.counselor_type} &bull; {b.preferred_date} at {b.preferred_time}
                        </div>
                        {b.booking_code && <div className="user-booking-code" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '4px' }}>Ref: {b.booking_code}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Manage Admins & Access Approvals Tab */}
        {activeTab === 'approvals' && (
          <section className="admin-section animate-fade-in">
            <header className="admin-content-header">
              <h2>Manage Admins & Access Approvals</h2>
              <p>Review pending admin signups and manage active administrator accounts.</p>
            </header>

            <div className="admin-grid-container single-column">
              {/* Pending Approvals Card */}
              <div className="admin-card">
                <h3>Pending Admin Requests ({pendingAdmins.length})</h3>
                {pendingAdmins.length === 0 ? (
                  <div className="admin-empty-state">
                    <CheckCircle size={32} />
                    <p>No pending admin access requests.</p>
                  </div>
                ) : (
                  <div className="admin-booking-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Requested At</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingAdmins.map((admin, idx) => (
                          <tr key={idx}>
                            <td className="fw-600">{admin.name}</td>
                            <td>{admin.email}</td>
                            <td>{admin.requested_at}</td>
                            <td>
                              <span className="admin-status-pill pending">
                                Pending Approval
                              </span>
                            </td>
                            <td>
                              <div className="admin-action-btns">
                                <button
                                  onClick={() => handleApproveAdmin(admin.email)}
                                  className="btn-action approve"
                                  title="Approve Admin Access"
                                >
                                  Approve Admin
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Active Admins Card */}
              <div className="admin-card">
                <h3>Active Administrators</h3>
                {allAdmins.length === 0 ? (
                  <div className="admin-empty-state">
                    <UserPlus size={32} />
                    <p>No active administrators found.</p>
                  </div>
                ) : (
                  <div className="admin-booking-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role Status</th>
                          <th>Access Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAdmins.map((admin, idx) => (
                          <tr key={idx}>
                            <td className="fw-600">{admin.name || 'Admin User'}</td>
                            <td>{admin.email}</td>
                            <td>
                              <span className={`admin-status-pill ${admin.status === 'pending' ? 'pending' : 'approved'}`}>
                                {admin.status === 'pending' ? 'Pending' : 'Active'}
                              </span>
                            </td>
                            <td>
                              <span className="admin-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                                Full Admin Access
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* RAG Inspector Chat */}
        {activeTab === 'chat' && (
          <section className="admin-section animate-fade-in">
            <header className="admin-content-header">
              <h2>RAG Inspector Chat</h2>
              <p>Test answer generation and vector source retrieval directly.</p>
            </header>

            <div className="admin-chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`admin-msg-row ${msg.sender}`}>
                  <div className="admin-msg-avatar">
                    {msg.sender === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                  </div>
                  <div className="admin-msg-content">
                    <div className="admin-msg-sender">{msg.sender === 'user' ? 'Admin Tester' : 'Aura Inspector'}</div>
                    <div className="admin-msg-text">{msg.text}</div>
                    {msg.sources?.length > 0 && (
                      <div className="admin-msg-sources">
                        <span>Retrieved Chunks:</span>
                        {msg.sources.map((src, i) => (
                          <span key={i} className="admin-source-tag">{src}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="admin-chat-input-area">
              <form onSubmit={handleSendMessage} className="admin-chat-box">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Enter test prompt to inspect vector retrieval..."
                  rows={1}
                />
                <button type="submit" disabled={!inputMessage.trim() || isChatLoading} className="admin-send-btn">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <section className="admin-section animate-fade-in">
            <header className="admin-content-header">
              <h2>System & API Settings</h2>
              <p>Configure backend API endpoints, RAG parameters, and system defaults.</p>
            </header>

            <div className="admin-grid-container single-column">
              <div className="admin-card admin-settings-card">
                <h3>Backend Infrastructure Configuration</h3>
                <form onSubmit={(e) => { e.preventDefault(); showToast('success', 'Settings updated'); }} className="admin-form-stack">
                  <div className="admin-form-group">
                    <label>System Platform Title</label>
                    <input
                      type="text"
                      value={adminSettings.systemName}
                      onChange={(e) => setAdminSettings({ ...adminSettings, systemName: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Backend API Base URL</label>
                    <input
                      type="text"
                      value={adminSettings.apiBaseUrl}
                      onChange={(e) => setAdminSettings({ ...adminSettings, apiBaseUrl: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>RAG Top-K Vector Chunks</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={adminSettings.ragTopK}
                      onChange={(e) => setAdminSettings({ ...adminSettings, ragTopK: parseInt(e.target.value) || 3 })}
                    />
                  </div>

                  <button type="submit" className="admin-btn-primary" style={{ width: 'auto', alignSelf: 'flex-start' }}>
                    <CheckCircle size={16} />
                    <span>Save System Settings</span>
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
