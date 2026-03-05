import { useState, useMemo } from 'react'
import mapsData from './data/maps.json'
import { Search, Filter, CheckCircle2, Circle, SortAsc, SortDesc, Clock, Star, Map as MapIcon, User, Award, Trophy, Users } from 'lucide-react'
import './App.css'

interface MapEntry {
  name: string;
  difficulty: string;
  stars: string;
  stars_count: number;
  points: number;
  creator: string;
  date: string;
}

interface MapsJson {
  maps: MapEntry[];
  progress: Record<string, Record<string, number>>;
  players: string[];
}

const data = mapsData as MapsJson;

type SortField = keyof MapEntry | 'time';

function App() {
  const [search, setSearch] = useState('')
  const [diffFilter, setDiffFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPlayer, setCurrentPlayer] = useState('All Players')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const difficulties = useMemo(() => ['All', ...new Set(data.maps.map(m => m.difficulty))], [])
  const allPlayers = useMemo(() => ['All Players', ...data.players.sort()], [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  }

  const getMapTime = (mapName: string) => {
    const mapProgress = data.progress[mapName] || {};
    if (currentPlayer === 'All Players') {
      const times = Object.values(mapProgress);
      return times.length > 0 ? Math.min(...times) : Infinity;
    }
    return mapProgress[currentPlayer] ?? Infinity;
  };

  const filteredMaps = useMemo(() => {
    return data.maps
      .filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                             m.creator.toLowerCase().includes(search.toLowerCase());
        const matchesDiff = diffFilter === 'All' || m.difficulty === diffFilter;
        
        const mapProgress = data.progress[m.name] || {};
        const isFinishedByCurrent = currentPlayer === 'All Players' 
          ? Object.keys(mapProgress).length > 0 
          : !!mapProgress[currentPlayer];

        const matchesStatus = statusFilter === 'All' || 
                             (statusFilter === 'Finished' && isFinishedByCurrent) || 
                             (statusFilter === 'Pending' && !isFinishedByCurrent);
        
        return matchesSearch && matchesDiff && matchesStatus;
      })
      .sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortField === 'time') {
          valA = getMapTime(a.name);
          valB = getMapTime(b.name);
        } else {
          valA = a[sortField];
          valB = b[sortField];
        }
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        // Handle Infinity for sorting unfinished maps to bottom
        if (valA === valB) return 0;
        const res = valA > valB ? 1 : -1;
        return sortOrder === 'asc' ? res : -res;
      });
  }, [search, diffFilter, statusFilter, sortField, sortOrder, currentPlayer]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'time' ? 'asc' : 'asc'); // Usually want fastest first
    }
  }

  const stats = useMemo(() => {
    let finished = 0;
    let points = 0;
    
    data.maps.forEach(m => {
      const mapProgress = data.progress[m.name] || {};
      const isFinished = currentPlayer === 'All Players' 
        ? Object.keys(mapProgress).length > 0 
        : !!mapProgress[currentPlayer];
      
      if (isFinished) {
        finished++;
        points += m.points;
      }
    });

    return {
      finished,
      total: data.maps.length,
      percent: ((finished / data.maps.length) * 100).toFixed(1),
      points
    }
  }, [currentPlayer]);

  return (
    <div className="container">
      <header className="main-header">
        <div className="header-content">
          <div className="title-section">
            <Award className="icon-gold" size={32} />
            <h1>KoG Solo Tracker</h1>
          </div>
          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-label">{currentPlayer === 'All Players' ? 'Global Progress' : 'Player Progress'}</span>
              <span className="stat-value">{stats.finished} / {stats.total} ({stats.percent}%)</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Points</span>
              <span className="stat-value">{stats.points}</span>
            </div>
          </div>
        </div>

        <div className="controls">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search maps or creators..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="filters">
            <div className="filter-group">
              <Users size={16} />
              <select value={currentPlayer} onChange={(e) => setCurrentPlayer(e.target.value)}>
                {allPlayers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <Filter size={16} />
              <select value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)}>
                {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Finished">Finished</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </header>

      <main className="table-wrapper">
        <table className="maps-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('name')} className="sortable">
                <MapIcon size={16} /> Map {sortField === 'name' && (sortOrder === 'asc' ? <SortAsc size={14}/> : <SortDesc size={14}/>)}
              </th>
              <th onClick={() => toggleSort('difficulty')} className="sortable">
                Difficulty {sortField === 'difficulty' && (sortOrder === 'asc' ? <SortAsc size={14}/> : <SortDesc size={14}/>)}
              </th>
              <th onClick={() => toggleSort('stars_count')} className="sortable">
                <Star size={16} /> Stars {sortField === 'stars_count' && (sortOrder === 'asc' ? <SortAsc size={14}/> : <SortDesc size={14}/>)}
              </th>
              <th onClick={() => toggleSort('points')} className="sortable">
                Points {sortField === 'points' && (sortOrder === 'asc' ? <SortAsc size={14}/> : <SortDesc size={14}/>)}
              </th>
              <th onClick={() => toggleSort('creator')} className="sortable">
                <User size={16} /> Creator {sortField === 'creator' && (sortOrder === 'asc' ? <SortAsc size={14}/> : <SortDesc size={14}/>)}
              </th>
              <th onClick={() => toggleSort('time')} className="sortable">
                <Clock size={16} /> Time / Leaderboard {sortField === 'time' && (sortOrder === 'asc' ? <SortAsc size={14}/> : <SortDesc size={14}/>)}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMaps.map(map => {
              const mapProgress = data.progress[map.name] || {};
              const playerTime = currentPlayer === 'All Players' ? null : mapProgress[currentPlayer];
              const isFinished = Object.keys(mapProgress).length > 0;
              
              // Sort leaderboard
              const leaderboard = Object.entries(mapProgress)
                .sort(([, a], [, b]) => a - b);

              return (
                <tr key={map.name} className={playerTime || (currentPlayer === 'All Players' && isFinished) ? 'row-finished' : ''}>
                  <td className="font-bold">{map.name}</td>
                  <td>
                    <span className={`badge badge-${map.difficulty.toLowerCase()}`}>
                      {map.difficulty}
                    </span>
                  </td>
                  <td className="stars">{map.stars}</td>
                  <td className="font-mono">{map.points}</td>
                  <td className="text-dim">{map.creator}</td>
                  <td>
                    {isFinished ? (
                      <div className="leaderboard">
                        {currentPlayer !== 'All Players' && playerTime ? (
                          <div className="status-finished">
                            <CheckCircle2 className="icon-success" size={16} />
                            <span className="time-display highlight">{formatTime(playerTime)}</span>
                          </div>
                        ) : null}
                        
                        <div className="top-finishers">
                          {leaderboard.slice(0, 3).map(([player, time], idx) => (
                            <div key={player} className="finisher-tag" title={`${player}: ${formatTime(time)}`}>
                              {idx === 0 && <Trophy size={10} className="icon-gold" />}
                              <span className="finisher-name">{player}</span>
                              <span className="finisher-time">{formatTime(time)}</span>
                            </div>
                          ))}
                          {leaderboard.length > 3 && <span className="more-count">+{leaderboard.length - 3} more</span>}
                        </div>
                      </div>
                    ) : (
                      <Circle className="text-dim" size={18} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </main>
      
      {filteredMaps.length === 0 && (
        <div className="empty-state">
          <p>No maps found matching your search.</p>
        </div>
      )}
    </div>
  )
}

export default App
