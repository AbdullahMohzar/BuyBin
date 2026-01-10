import { useState } from 'react';

function Search() {
  // existing states
  const [query, setQuery] = useState('');
  const [pokemon, setPokemon] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // NEW state for dark mode
  const [darkMode, setDarkMode] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setPokemon(null);

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query.toLowerCase()}`);
      if (!res.ok) throw new Error('Pokémon not found');
      const data = await res.json();
      setPokemon(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`outer-wrapper ${darkMode ? 'dark' : ''}`}>
      <div className="rainbow-outline">
        <div className="search-container">
          <div style={{ textAlign: 'right', marginBottom: '10px' }}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="dark-toggle-btn"
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>

          <h1 className="search-title">Search Pokémon</h1>

          <div className="search-box">
            <input
              type="text"
              placeholder="Enter Pokémon name"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="search-button"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}

          {pokemon && (
            <div className="pokemon-card">
              <h2>{pokemon.name}</h2>
              <img src={pokemon.sprites.front_default} alt={pokemon.name} />
              <p><strong>Height:</strong> {pokemon.height}</p>
              <p><strong>Weight:</strong> {pokemon.weight}</p>
              <p><strong>Type:</strong> {pokemon.types.map(t => t.type.name).join(', ')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Search;
