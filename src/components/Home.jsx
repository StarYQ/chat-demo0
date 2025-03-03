'use client';

import styles from './home.module.css';
import React from 'react';
import Navbar from './Navbar';

export default function Home({ user }) {
  return (
    <div>
      <Navbar user={user} />
      <main style={{ padding: '1rem' }}>
        <h1>Welcome to QuattronKidsChatDemo!</h1>
        {user ? (
          <div className={styles.userInfo}>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Name:</strong> {user.name}</p>
          </div>
        ) : (
          <p>Please log in to see your information.</p>
        )}
      </main>
      <footer style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p>&copy; {new Date().getFullYear()} QuattronKidsChatDemo</p>
      </footer>
    </div>
  );
}
