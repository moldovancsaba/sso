import { useState } from 'react'
import Head from 'next/head'

export default function TestFetch() {
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const testLogin = async () => {
    setResult('Testing...')
    setError('')
    
    try {
      console.log('Starting fetch...')
      const res = await fetch('/api/public/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpass123'
        })
      })
      
      console.log('Fetch completed, status:', res.status)
      const data = await res.json()
      console.log('Response data:', data)
      
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      console.error('Fetch error:', err)
      setError(`Error: ${err.message}\nType: ${err.constructor.name}\nStack: ${err.stack}`)
    }
  }

  return (
    <>
      <Head>
        <title>Fetch Test</title>
      </Head>
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Fetch Test Page</h1>
        <button 
          onClick={testLogin}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Test Login API
        </button>
        
        {result && (
          <div style={{ marginTop: '20px', padding: '20px', background: '#efe', borderRadius: '8px' }}>
            <h3>Success:</h3>
            <pre>{result}</pre>
          </div>
        )}
        
        {error && (
          <div style={{ marginTop: '20px', padding: '20px', background: '#fee', borderRadius: '8px' }}>
            <h3>Error:</h3>
            <pre>{error}</pre>
          </div>
        )}
      </div>
    </>
  )
}
