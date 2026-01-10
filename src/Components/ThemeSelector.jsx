import React from 'react';
import { useTheme } from '../Context/ThemeContext';
import './ThemeSelector.css';

const themes = [
  {
    id: 'light',
    name: 'Light',
    colors: { bg: '#ffffff', accent: '#3b82f6' }
  },
  {
    id: 'dark',
    name: 'Dark',
    colors: { bg: '#1f2937', accent: '#60a5fa' }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: { bg: '#0f172a', accent: '#14b8a6' }
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    colors: { bg: '#000000', accent: '#ffff00' }
  }
];

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-selector-container">
      <h3>Select Theme</h3>
      <div className="theme-grid">
        {themes.map((t) => (
          <button
            key={t.id}
            className={`theme-card ${theme === t.id ? 'active' : ''}`}
            onClick={() => setTheme(t.id)}
            aria-label={`Select ${t.name} theme`}
            title={t.name}
          >
            <div 
              className="theme-preview" 
              style={{ backgroundColor: t.colors.bg }}
            >
              <div 
                className="theme-accent" 
                style={{ backgroundColor: t.colors.accent }} 
              />
            </div>
            <span className="theme-name">{t.name}</span>
            {theme === t.id && <div className="theme-check">✓</div>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;
