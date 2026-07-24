import React from 'react';

interface ViewToggleProps {
  view: 'grid' | 'list';
  setView: (view: 'grid' | 'list') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ view, setView }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setView('grid')}
        className={
          view === 'grid' ? 'font-bold underline' : 'text-gray-500'
        }
      >
        Grid
      </button>
      <button
        onClick={() => setView('list')}
        className={
          view === 'list' ? 'font-bold underline' : 'text-gray-500'
        }
      >
        List
      </button>
    </div>
  );
};
