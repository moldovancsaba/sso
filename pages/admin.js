import { useEffect, useState } from 'react';

export default function Admin() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('/api/list').then(res => res.json()).then(data => setItems(data));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Identifier List</h1>
      <ul>
        {items.map(item => (
          <li key={item._id} className="mb-2">
            {item.value} (Created: {new Date(item.createdAt).toLocaleString()})
          </li>
        ))}
      </ul>
    </div>
  );
}
