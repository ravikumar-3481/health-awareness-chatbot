import React, { useState, useEffect } from 'react';
import UserDashboard from './user/UserDashboard';
import AdminDashboard from './admin/AdminDashboard';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || 'https://health-awareness-chatbot-5.onrender.com/api';

export default function App() {
  // Current user session state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('aura_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    // Listen for Supabase OAuth callback & auth session state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        const metadata = session.user.user_metadata || {};
        const email = session.user.email || '';
        const name = metadata.full_name || metadata.name || email.split('@')[0] || 'User';
        const role = metadata.role || 'user';
        const adminApproved = metadata.admin_approved !== false;

        const userObj = {
          email: email,
          name: name,
          role: role,
          admin_approved: adminApproved
        };

        setCurrentUser(userObj);
        localStorage.setItem('aura_user', JSON.stringify(userObj));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = (userObj, msg) => {
    setCurrentUser(userObj);
    localStorage.setItem('aura_user', JSON.stringify(userObj));
    showToast('success', msg);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log('Supabase signout notice:', e);
    }
    setCurrentUser(null);
    localStorage.removeItem('aura_user');
    showToast('info', 'Signed out successfully');
  };

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Index Landing Auth Gate: Render Auth Modal if unauthenticated */}
      {!currentUser ? (
        <AuthModal
          isOpen={true}
          onClose={() => {}} // Mandatory landing gate
          onAuthSuccess={handleAuthSuccess}
          API_BASE={API_BASE}
        />
      ) : currentUser.role === 'admin' ? (
        <AdminDashboard
          currentUser={currentUser}
          onSignOut={handleSignOut}
          showToast={showToast}
          API_BASE={API_BASE}
        />
      ) : (
        <UserDashboard
          currentUser={currentUser}
          onSignOut={handleSignOut}
          showToast={showToast}
          API_BASE={API_BASE}
        />
      )}
    </>
  );
}
