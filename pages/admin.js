import { useEffect, useState } from 'react';

export default function Admin() {
  const [items, setItems] = useState([]);
  const [editingValue, setEditingValue] = useState('');
  const [editIndex, setEditIndex] = useState(null);

  useEffect(() => {
    fetch('/api/list')
      .then(res => res.json())
      .then(data => setItems(data));
  }, []);

  const handleDelete = async (value) => {
    await fetch('/api/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
    setItems(items.filter(item => item.value !== value));
  };

  const handleEdit = (index, value) => {
    setEditIndex(index);
    setEditingValue(value);
  };

  const handleSave = async (oldValue) => {
    await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldValue, newValue: editingValue })
    });
    const updated = items.map((item, i) => 
      i === editIndex ? { ...item, value: editingValue } : item
    );
    setItems(updated);
    setEditIndex(null);
    setEditingValue('');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Identifier Management</h1>
      <ul className="space-y-4">
        {items.map((item, index) => (
          <li key={item._id} className="border p-4 rounded shadow-sm bg-white">
            {editIndex === index ? (
              <input
                className="border px-2 py-1"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
              />
            ) : (
              <strong>{item.value}</strong>
            )}
            <div className="text-sm text-gray-600 mt-1">
              Created: {new Date(item.createdAt).toISOString()}
            </div>
            <div className="text-sm mt-2">
              <strong>Activity Log:</strong>
              <ul className="list-disc ml-5 text-xs mt-1">
                {item.activities?.map((act, i) => (
                  <li key={i}>
                    {act.type} @ {new Date(act.timestamp).toISOString()}
                    {act.source ? ` from ${act.source}` : ''}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 mt-3">
              {editIndex === index ? (
                <button
                  onClick={() => handleSave(item.value)}
                  className="bg-green-500 text-white px-2 py-1 rounded"
                >
                  Save
                </button>
              ) : (
                <button
                  onClick={() => handleEdit(index, item.value)}
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleDelete(item.value)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
