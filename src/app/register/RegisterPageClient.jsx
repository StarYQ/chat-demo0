// file: src/app/register/RegisterPageClient.jsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import styles from '../login/login.module.css'; // Reuse login styles

export default function RegisterPageClient() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Sign up the user in Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName }, // Store name in metadata
        },
      });

      if (error) throw error;
      
      // 2. Call `/api/create-user` to insert into the profiles table
      const createUserResponse = await fetch('/api/create-user', { method: 'POST' });

      if (!createUserResponse.ok) {
        console.error('Failed to create user in profiles table');
      }
      
      // If successful, redirect user to login
      alert('Registration successful!');
      router.push('/login');
    } catch (error) {
      console.error('Registration error:', error.message);
      alert('Registration failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Navbar />
      </header>
      <main className={styles.main}>
        <h1>Register</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className={styles.registerLink}>
          Already have an account? <a href="/login">Log in here</a>
        </p>
      </main>
    </div>
  );
}
