import { useState } from 'react';

export default function Home() {
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
    const data = await res.json();
    setMessage(data.message || 'Token issued');
    document.cookie = `token=${data.token}; path=/`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit}>
        <input
          className="border p-2"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Enter identifier"
        />
        <button className="ml-2 p-2 bg-blue-500 text-white" type="submit">Submit</button>
        <p className="mt-4">{message}</p>
      </form>
    </div>
  );
}
