'use client';

import React from 'react';
import Link from 'next/link';
import styles from './navbar.module.css';
import supabase from '../lib/supabase';

export default function Navbar({ user }) {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    window.location.href = '/';
  };
  
  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.navLogo}>QKChatDemo</Link>
      <div className={styles.navLinks}>
        {user ? (
          <>
            <Link href="/chats">Chats</Link>
            <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
