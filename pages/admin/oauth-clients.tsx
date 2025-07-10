import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { OAuthClient } from '../../lib/types/oauth';

type EditState = Omit<OAuthClient, 'redirectUris'> & {
  redirectUris: string;
};

export default function OAuthClientsPage() {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newClient, setNewClient] = useState({ name: '', redirectUris: '' });
  const [editState, setEditState] = useState<EditState | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/oauth/clients', {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_DEFAULT_API_KEY!,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const data = await response.json();
      setClients(data);
      setLoading(false);
    } catch (err) {
      setError('Error loading OAuth clients');
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/oauth/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_DEFAULT_API_KEY!,
        },
        body: JSON.stringify({
          name: newClient.name,
          redirectUris: newClient.redirectUris.split(',').map(uri => uri.trim())
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create client');
      }

      setNewClient({ name: '', redirectUris: '' });
      fetchClients();
    } catch (err) {
      setError('Error creating OAuth client');
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editState) return;

    try {
      const response = await fetch(`/api/oauth/clients/${editState.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_DEFAULT_API_KEY!,
        },
        body: JSON.stringify({
          name: editState.name,
          redirectUris: editState.redirectUris.split(',').map(uri => uri.trim())
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update client');
      }

      setEditState(null);
      fetchClients();
    } catch (err) {
      setError('Error updating OAuth client');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-100 p-8">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">OAuth Clients</h1>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg font-medium text-gray-900">Create New Client</h2>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <form onSubmit={handleCreateClient} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Redirect URIs (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newClient.redirectUris}
                      onChange={(e) => setNewClient({ ...newClient, redirectUris: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create Client
                  </button>
                </form>
              </div>
            </div>

            {editState && (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">Edit Client</h2>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <form onSubmit={handleUpdateClient} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Client Name
                      </label>
                      <input
                        type="text"
                        value={editState.name}
                        onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Redirect URIs (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={editState.redirectUris}
                        onChange={(e) => setEditState({ ...editState, redirectUris: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Update Client
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditState(null)}
                        className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 text-sm text-red-600">{error}</div>
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg font-medium text-gray-900">Registered Clients</h2>
              </div>
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {clients.map((client) => (
                    <li key={client.id} className="px-4 py-4 sm:px-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-indigo-600">{client.name}</div>
                          <div className="text-sm text-gray-500">
                            Created: {new Date(client.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-gray-900">
                          <strong>Client ID:</strong> {client.clientId}
                        </div>
                        <div className="text-sm text-gray-900">
                          <strong>Client Secret:</strong> {client.clientSecret}
                        </div>
                        <div className="text-sm text-gray-900">
                          <strong>Redirect URIs:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {client.redirectUris.map((uri, index) => (
                              <li key={index}>{uri}</li>
                            ))}
                          </ul>
                        </div>
                        <button
                          onClick={() => setEditState({ 
                            ...client,
                            redirectUris: client.redirectUris.join(',') 
                          })}
                          className="inline-flex justify-center py-1 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Edit
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
