import React, { useState, useEffect } from 'react';
import { URLConfigDocument } from '../../lib/types/url-config';

const AdminPanel: React.FC = () => {
  const [urlConfigs, setUrlConfigs] = useState<URLConfigDocument[]>([]);
  const [newConfig, setNewConfig] = useState({
    name: '',
    baseUrl: '',
    tenantId: '',
    environment: 'development',
    callbackUrls: [''],
  });

  useEffect(() => {
    fetch('/api/url-configs')
      .then(response => response.json())
      .then(data => setUrlConfigs(data));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewConfig({ ...newConfig, [name]: value });
  };

  const addUrlConfig = () => {
    fetch('/api/url-configs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newConfig)
    })
      .then(response => response.json())
      .then(data => setUrlConfigs([...urlConfigs, data]));
  };

  return (
    <div>
      <h1>Admin Panel for URL Configurations</h1>

      <div>
        <h2>Add New Configuration</h2>
        <input type="text" name="name" value={newConfig.name} onChange={handleChange} placeholder="Name" />
        <input type="text" name="baseUrl" value={newConfig.baseUrl} onChange={handleChange} placeholder="Base URL" />
        <input type="text" name="tenantId" value={newConfig.tenantId} onChange={handleChange} placeholder="Tenant ID" />
        <input type="text" name="environment" value={newConfig.environment} onChange={handleChange} placeholder="Environment" />
        <button onClick={addUrlConfig}>Add Configuration</button>
      </div>

      <div>
        <h2>Existing Configurations</h2>
        <ul>
          {urlConfigs.map(config => (
            <li key={config._id.toString()}>
              {config.name} ({config.environment}) - {config.baseUrl}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminPanel;
