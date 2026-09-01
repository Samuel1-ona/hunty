import { useEffect, useState } from 'react';

interface RecentItem {
  id: string;
  name: string;
  type: 'user' | 'video' | 'etc';
  createdAt: string;
}

export default function CreatorRecent() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent items
    fetch('/api/creator/recent')
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading recent...</div>;
  }

  return (
    <div className="creator-recent">
      <h2>Recent</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span> - <span>{item.type}</span> - <span>{item.createdAt}</span>
          </li>
        ));
      </ul>
    </div>
  );
}
