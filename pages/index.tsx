import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { signIn, useSession } from 'next-auth/react';
import { EmojiPicker } from '../components/EmojiPicker';
import { EMOJIS, BASE_COLORS } from '../lib/types/identity';

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Identifier/Email, Step 2: Emoji Identity
  const [loginMethod, setLoginMethod] = useState('anonymous'); // 'anonymous' or 'email'
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [acceptedGtc, setAcceptedGtc] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [selectedEmojiIdx, setSelectedEmojiIdx] = useState<number | null>(null);

const handleStepOne = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loginMethod === 'anonymous' && !identifier) {
      setError('Identifier is required');
      return;
    }

    if (loginMethod === 'email' && !email) {
      setError('Email is required');
      return;
    }

    if (loginMethod === 'email' && !email.includes('@')) {
      setError('Invalid email format');
      return;
    }
    
    if (!acceptedGtc || !acceptedPrivacy) {
      setError('Please accept both GTC and Privacy Policy to continue');
      return;
    }

    setError('');
    setCurrentStep(2);
  };

const handleStepTwo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedEmojiIdx === null) {
      setError('Please select an emoji identity');
      return;
    }

    const selectedEmoji = EMOJIS[selectedEmojiIdx];
    const selectedColor = BASE_COLORS[selectedEmojiIdx % BASE_COLORS.length];

    try {
      // Try OAuth flow first
      const result = await signIn('sso', {
        identifier: loginMethod === 'anonymous' ? identifier : email,
        redirect: false,
        emoji: selectedEmoji,
        color: selectedColor
      });

      if (result?.error) {
        // If OAuth fails, fallback to direct token creation
        const res = await fetch('/api/auth/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.NEXT_PUBLIC_DEFAULT_API_KEY!,
          },
          body: JSON.stringify({
            identifier: loginMethod === 'anonymous' ? identifier : null,
            email: loginMethod === 'email' ? email : null,
            emoji: selectedEmoji,
            color: selectedColor
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to login');
        }

        setToken(data.token);
        setError('');
      } else {
        // OAuth success
        setError('');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout>
      <Head>
        <title>SSO</title>
      </Head>
      
      <div className="container py-8 md:py-12">
        <div className="max-w-md mx-auto">
          <div className="card">
            <h1 className="text-center mb-8">SSO</h1>
            
            <form onSubmit={currentStep === 1 ? handleStepOne : handleStepTwo} className="space-y-6">
              {currentStep === 1 ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="anonymous"
                          checked={loginMethod === 'anonymous'}
                          onChange={(e) => setLoginMethod(e.target.value)}
                          className="h-4 w-4 text-indigo-600 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Anonymous Login</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          value="email"
                          checked={loginMethod === 'email'}
                          onChange={(e) => setLoginMethod(e.target.value)}
                          className="h-4 w-4 text-indigo-600 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Email Login</span>
                      </label>
                    </div>

                    {loginMethod === 'anonymous' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Identifier
                        </label>
                        <input
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="input"
                          placeholder="Enter any identifier"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="input"
                          placeholder="Enter your email address"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Sign in with email to unlock future benefits
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="accept-gtc"
                        checked={acceptedGtc}
                        onChange={(e) => setAcceptedGtc(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                      />
                      <label htmlFor="accept-gtc" className="ml-2 block text-sm text-gray-900">
                        I accept the <a href="/docs/gtc" className="text-indigo-600 hover:text-indigo-800" target="_blank" rel="noopener noreferrer">General Terms and Conditions</a>
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="accept-privacy"
                        checked={acceptedPrivacy}
                        onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                      />
                      <label htmlFor="accept-privacy" className="ml-2 block text-sm text-gray-900">
                        I accept the <a href="/docs/privacy-policy" className="text-indigo-600 hover:text-indigo-800" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Choose Your Identity</h2>
                    <EmojiPicker
                      selectedIdx={selectedEmojiIdx}
                      onSelect={setSelectedEmojiIdx}
                      onConfirm={() => {
                        const e = new Event('submit') as any;
                        handleStepTwo(e);
                      }}
                    />
                    <p className="mt-4 text-sm text-gray-500">
                      Select an emoji and color combination that will represent you.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col space-y-3">
                <button type="submit" className="btn-primary w-full">
                  {currentStep === 1 ? 'Next' : 'Get Token'}
                </button>
                {currentStep === 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setError('');
                    }}
                    className="btn-secondary w-full"
                  >
                    Back
                  </button>
                )}
              </div>
            </form>

            {error && (
              <div className="mt-4 text-sm text-red-600">{error}</div>
            )}

            {token && (
              <div className="mt-6 space-y-2">
                <h2>Your JWT Token:</h2>
                <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                  <code className="text-sm break-all">{token}</code>
                </div>
                <p className="text-sm text-gray-500">
                  This token will expire in 10 minutes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
