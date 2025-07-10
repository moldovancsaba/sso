import React, { useEffect, useState } from 'react';
import { UserAvatar } from '../components/UserAvatar';
import { Identity } from '../lib/types/identity';
import { EmojiPicker, ColorEmojiPair } from '../components/EmojiPicker';

const validateTag = (tag: string) => tag.length > 0 && tag.length <= 16;

export default function IdentityPage() {
  const [tag, setTag] = useState("");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [colorEmojiPairs, setColorEmojiPairs] = useState<ColorEmojiPair[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (colorEmojiPairs.length > 0) {
      setSelectedIdx(Math.floor(Math.random() * colorEmojiPairs.length));
    }
  }, [colorEmojiPairs]);

  const handleSelect = (idx: number) => setSelectedIdx(idx);
  
  const onConfirm = async () => {
    if (!validateTag(tag.trim())) {
      setError("Enter a username (1-16 chars)");
      return;
    }
    if (selectedIdx === null) {
      setError("Pick an emoji + color!");
      return;
    }

    setError("");
    const { color, emoji } = colorEmojiPairs[selectedIdx];
    const identity: Identity = {
      gametag: tag.trim(),
      color,
      emoji,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Create identity in database
      const response = await fetch('/api/identities/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(identity),
      });

      if (!response.ok) throw new Error('Failed to create identity');

      const createdIdentity = await response.json();
      localStorage.setItem("sso_identity", JSON.stringify(createdIdentity));
      window.location.href = "/";
    } catch (err) {
      setError("Failed to create identity. Please try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-white px-3">
      <div className="bg-white/95 rounded-xl shadow-2xl mx-auto p-4 pb-6 w-full max-w-xs flex flex-col items-center gap-5">
        <h2 className="text-xl font-bold text-center my-1">Identify Yourself</h2>
        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-5">
          <input
            placeholder="Username"
            maxLength={16}
            value={tag}
            onChange={e => setTag(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-3 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            inputMode="text"
            autoFocus
            aria-label="Enter username"
          />
          <EmojiPicker
            selectedIdx={selectedIdx}
            onSelect={handleSelect}
            onConfirm={onConfirm}
          />
          <button
            type="submit"
            className="w-full py-3 text-lg bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start
          </button>
          {error && (
            <div className="text-center text-red-500 text-xs mt-2">{error}</div>
          )}
        </form>
      </div>
    </div>
  );
}
