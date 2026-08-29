import React from 'react';
import { Search, Filter, RotateCw } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        maxWidth: '540px',
      }}
    >
      {/* Search Input Pill */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#F3F4F6',
          borderRadius: '9999px',
          padding: '8px 16px',
        }}
      >
        <Search size={16} color="#9CA3AF" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search"
          style={{
            backgroundColor: 'transparent',
            width: '100%',
            fontSize: '14px',
            color: '#111827',
          }}
        />
      </div>

      {/* Filter Icon */}
      <button
        title="Filter"
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9CA3AF',
          borderRadius: '50%',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#4B5563';
          e.currentTarget.style.backgroundColor = '#F3F4F6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9CA3AF';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Filter size={18} />
      </button>

      {/* Refresh Icon */}
      <button
        onClick={onRefresh}
        title="Refresh"
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9CA3AF',
          borderRadius: '50%',
          transform: isRefreshing ? 'rotate(360deg)' : 'none',
          transition: 'transform 0.5s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#4B5563';
          e.currentTarget.style.backgroundColor = '#F3F4F6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9CA3AF';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <RotateCw size={18} />
      </button>
    </div>
  );
};
