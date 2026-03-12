import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import mapsData from './data/maps.json'
import { Search, Filter, CheckCircle2, Circle, SortAsc, SortDesc, Clock, Star, Map as MapIcon, User, Award, Trophy, Users, X, Maximize2, Minimize2, PlayCircle, Play, Pause } from 'lucide-react'
import './App.css'

interface MapEntry {
  name: string;
  difficulty: string;
  stars: string;
  stars_count: number;
  points: number;
  length: string;
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

const DIFFICULTIES = ['All', 'Easy', 'Main', 'Hard', 'Insane', 'Extreme', 'Mod', 'Others'];
const LENGTHS = ['All', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'WTF', '-'];
const LENGTH_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'WTF', '-'];
const ALL_PLAYERS = ['All Players', ...data.players.sort()];
const VALID_SORT_FIELDS: SortField[] = ['name', 'difficulty', 'stars', 'stars_count', 'points', 'length', 'creator', 'date', 'time'];
const VALID_STATUS = ['All', 'Finished', 'Pending'];

const SKIP_OPTIONS = [0.5, 1, 2, 5, 10];

function DemoViewer({ show, hasLoaded, pendingDemo, onClose }: { show: boolean, hasLoaded: boolean, pendingDemo: { url: string, name: string } | null, onClose: () => void }) {
  const [demoState, setDemoState] = useState<{isPaused: number, speed: number, firstTick: number, currentTick: number, lastTick: number} | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [skipInterval, setSkipInterval] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Use a ref to access the latest state in the event listener without re-attaching it
  const stateRef = useRef(demoState);
  const skipIntervalRef = useRef(skipInterval);
  
  useEffect(() => {
    stateRef.current = demoState;
  }, [demoState]);

  useEffect(() => {
    skipIntervalRef.current = skipInterval;
  }, [skipInterval]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const formatTick = (tick: number) => {
    const seconds = Math.max(0, Math.floor(tick / 50));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (show && pendingDemo && iframeRef.current) {
      const timer = setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'playDemo',
          demoUrl: pendingDemo.url,
          demoName: pendingDemo.name
        }, '*');
      }, 500);
      resetControlsTimer();
      return () => clearTimeout(timer);
    }
  }, [show, pendingDemo, resetControlsTimer]);

  // Use useCallback so we don't recreate the listener on every render
  const memoizedOnClose = useCallback(onClose, [onClose]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'closeDemoViewer') {
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage({ type: 'stopDemo' }, '*');
        }
        setDemoState(null);
        memoizedOnClose();
      } else if (event.data?.type === 'demoState') {
        setDemoState(event.data.state);
      } else if (event.data?.type === 'canvasClick') {
        setShowControls(false);
      } else if (event.data?.type === 'canvasMove') {
        resetControlsTimer();
      } else if (event.data?.type === 'togglePause') {
        if (stateRef.current) {
          iframeRef.current?.contentWindow?.postMessage({ type: 'pauseDemo', pause: !stateRef.current.isPaused }, '*');
        }
      } else if (event.data?.type === 'skip') {
        if (stateRef.current) {
          const skipTicks = skipIntervalRef.current * 50; 
          const newTick = Math.max(stateRef.current.firstTick, Math.min(stateRef.current.lastTick, stateRef.current.currentTick + (event.data.direction * skipTicks)));
          iframeRef.current?.contentWindow?.postMessage({ type: 'setDemoPos', tick: newTick }, '*');
        }
      } else if (event.data?.type === 'changeSpeed') {
        if (stateRef.current) {
          const newSpeed = event.data.direction > 0 ? 
            Math.min(10.0, stateRef.current.speed + 0.25) : 
            Math.max(0.25, stateRef.current.speed - 0.25);
          iframeRef.current?.contentWindow?.postMessage({ type: 'setDemoSpeed', speed: Math.round(newSpeed * 100) / 100 }, '*');
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!show) return;
      if (e.key === ' ' || e.keyCode === 32) {
        e.preventDefault();
        if (stateRef.current) {
          iframeRef.current?.contentWindow?.postMessage({ type: 'pauseDemo', pause: !stateRef.current.isPaused }, '*');
        }
      } else if (e.key === 'ArrowLeft' || e.keyCode === 37) {
        e.preventDefault();
        if (stateRef.current) {
          const skipTicks = skipIntervalRef.current * 50;
          const newTick = Math.max(stateRef.current.firstTick, Math.min(stateRef.current.lastTick, stateRef.current.currentTick - skipTicks));
          iframeRef.current?.contentWindow?.postMessage({ type: 'setDemoPos', tick: newTick }, '*');
        }
      } else if (e.key === 'ArrowRight' || e.keyCode === 39) {
        e.preventDefault();
        if (stateRef.current) {
          const skipTicks = skipIntervalRef.current * 50;
          const newTick = Math.max(stateRef.current.firstTick, Math.min(stateRef.current.lastTick, stateRef.current.currentTick + skipTicks));
          iframeRef.current?.contentWindow?.postMessage({ type: 'setDemoPos', tick: newTick }, '*');
        }
      } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
        e.preventDefault();
        if (stateRef.current) {
          const newSpeed = Math.min(10.0, stateRef.current.speed + 0.25);
          iframeRef.current?.contentWindow?.postMessage({ type: 'setDemoSpeed', speed: Math.round(newSpeed * 100) / 100 }, '*');
        }
      } else if (e.key === 'ArrowDown' || e.keyCode === 40) {
        e.preventDefault();
        if (stateRef.current) {
          const newSpeed = Math.max(0.25, stateRef.current.speed - 0.25);
          iframeRef.current?.contentWindow?.postMessage({ type: 'setDemoSpeed', speed: Math.round(newSpeed * 100) / 100 }, '*');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [memoizedOnClose, show, resetControlsTimer]);

  const handleScrubberAction = useCallback((clientX: number) => {
    if (!scrubberRef.current || !stateRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const totalTicks = stateRef.current.lastTick - stateRef.current.firstTick;
    const targetTick = stateRef.current.firstTick + Math.round(percentage * totalTicks);
    iframeRef.current?.contentWindow?.postMessage({ type: 'setDemoPos', tick: targetTick }, '*');
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleScrubberAction(e.clientX);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleScrubberAction(e.touches[0].clientX);
    resetControlsTimer();
  };

  const toggleControls = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!showControls) {
      resetControlsTimer();
    } else {
      setShowControls(false);
      if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleScrubberAction(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleScrubberAction(e.touches[0].clientX);
        resetControlsTimer();
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    const handleTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleScrubberAction, resetControlsTimer]);

  if (!hasLoaded) return null;

  const handleClose = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'stopDemo' }, '*');
    }
    setDemoState(null);
    onClose();
  };

  const progressPercent = demoState ? ((demoState.currentTick - demoState.firstTick) / (demoState.lastTick - demoState.firstTick)) * 100 : 0;

  return (
    <div className="modal-overlay" style={{ display: show ? 'flex' : 'none' }} onClick={handleClose}>
      <div className="modal-content demo-viewer-content" ref={containerRef} onClick={e => e.stopPropagation()}>
        <div className="modal-header demo-viewer-header">
          <div className="header-info">
            <PlayCircle size={18} className="text-blue" />
            <h3>{pendingDemo ? pendingDemo.name.split('_')[0] : 'Demo Viewer'}</h3>
            <span className="demo-filename">{pendingDemo ? pendingDemo.name : ''}</span>
          </div>
          <div className="modal-actions">
            <button className="close-button" onClick={handleClose}><X size={24} /></button>
          </div>
        </div>
        <div className={`modal-body demo-viewer-body ${isDragging ? 'dragging' : ''}`} onMouseMove={resetControlsTimer} onMouseEnter={resetControlsTimer} onClick={toggleControls}>
          <iframe 
            ref={iframeRef}
            src={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/demo-viewer/DDNet.html`} 
            title="DDNet Demo Viewer"
            allow="fullscreen"
            style={{ pointerEvents: isDragging ? 'none' : 'auto', width: '100%', height: '100%', border: 'none', position: 'relative', zIndex: 1 }}
          />
          
          <div className={`demo-timeline-container ${(!demoState && !pendingDemo) || (!showControls && !isDragging) ? 'hidden' : ''}`} style={{ zIndex: 100 }} onClick={e => e.stopPropagation()}>
            {demoState && (
              <div 
                className="demo-scrubber-wrapper" 
                ref={scrubberRef}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                style={{ height: '30px', display: 'flex', alignItems: 'center' }}
              >
                <div className="demo-scrubber-track" style={{ width: '100%' }}>
                  <div className="scrubber-progress" style={{ width: `${progressPercent}%` }}></div>
                  <div className="scrubber-handle" style={{ left: `${progressPercent}%`, display: 'block' }}></div>
                </div>
              </div>
            )}
            
            <div className="demo-controls-bar">
              <div className="controls-left">
                <button 
                  className="demo-play-pause"
                  onClick={() => {
                    if (demoState) {
                      iframeRef.current?.contentWindow?.postMessage({ type: 'pauseDemo', pause: !demoState.isPaused }, '*');
                    } else if (pendingDemo) {
                      iframeRef.current?.contentWindow?.postMessage({
                        type: 'playDemo',
                        demoUrl: pendingDemo.url,
                        demoName: pendingDemo.name
                      }, '*');
                    }
                  }}
                >
                  {(demoState && !demoState.isPaused) ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" style={{marginLeft: '2px'}} />}
                </button>
                
                {demoState && (
                  <div className="demo-time-display">
                    <span className="current">{formatTick(demoState.currentTick - demoState.firstTick)}</span>
                    <span className="separator">/</span>
                    <span className="total">{formatTick(demoState.lastTick - demoState.firstTick)}</span>
                  </div>
                )}
              </div>

              {!demoState && pendingDemo && (
                <div className="demo-status-text">Loading replay...</div>
              )}

              <div className="controls-right">
                {demoState && (
                  <>
                    <div className="skip-interval-selector">
                      <span className="label">Skip:</span>
                      <select value={skipInterval} onChange={(e) => setSkipInterval(parseFloat(e.target.value))}>
                        {SKIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}s</option>)}
                      </select>
                    </div>
                    <div className="demo-speed-selector">
                      <button 
                        className="speed-btn"
                        onClick={() => {
                          const newSpeed = Math.max(0.25, demoState.speed - 0.25);
                          iframeRef.current?.contentWindow?.postMessage({ type: 'setDemoSpeed', speed: Math.round(newSpeed * 100) / 100 }, '*');
                        }}
                      >
                        -
                      </button>
                      <div className="speed-value">
                        <Clock size={14} />
                        <span>{demoState.speed.toFixed(2)}x</span>
                      </div>
                      <button 
                        className="speed-btn"
                        onClick={() => {
                          const newSpeed = Math.min(10.0, demoState.speed + 0.25);
                          iframeRef.current?.contentWindow?.postMessage({ type: 'setDemoSpeed', speed: Math.round(newSpeed * 100) / 100 }, '*');
                        }}
                      >
                        +
                      </button>
                    </div>
                  </>
                )}
                
                <button 
                  className="maximize-btn" 
                  onClick={toggleFullscreen} 
                  title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
                >
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapPreview({ mapName, difficulty, isFull = false, onClose }: { mapName: string, difficulty: string, isFull?: boolean, onClose?: () => void }) {
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyKey, setCopyKey] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  // Reset error state when map changes
  useEffect(() => {
    setHasError(false);
    setCopied(false);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, [mapName]);

  if (isFull) {
    const diffParam = difficulty.toUpperCase();
    const url = `${baseUrl}/map_preview.html?map=${encodeURIComponent(mapName)}&diff=${encodeURIComponent(diffParam)}`;

    const handleShare = () => {
      const shareUrl = `${window.location.origin}${baseUrl}/preview/${encodeURIComponent(mapName)}.html`;
      navigator.clipboard.writeText(shareUrl);
      
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      
      setCopied(true);
      setCopyKey(prev => prev + 1);
      
      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{mapName}</h3>
            <div className="modal-actions">
              {copied && <span key={copyKey} className="copied-message">Copied!</span>}
              <button 
                className="share-button" 
                onClick={handleShare}
                title="Share"
              >
                Share
              </button>
              <button className="close-button" onClick={onClose}><X size={24} /></button>
            </div>
          </div>
          <div className="modal-body">
            <iframe src={url} title={`Map preview: ${mapName}`} />
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = `${baseUrl}/thumbnails/${encodeURIComponent(mapName)}.png`;
  return (
    <div className="hover-preview">
      {hasError ? (
        <span className="hover-preview-loading">No preview available</span>
      ) : (
        <img 
          src={imageUrl} 
          alt={`Map preview: ${mapName}`}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}

function App() {
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  })
  const [diffFilter, setDiffFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const val = params.get('diff') || 'All';
    return DIFFICULTIES.includes(val) ? val : 'All';
  })
  const [lengthFilter, setLengthFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const val = params.get('length') || 'All';
    return LENGTHS.includes(val) ? val : 'All';
  })
  const [statusFilter, setStatusFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const val = params.get('status') || 'All';
    return VALID_STATUS.includes(val) ? val : 'All';
  })
  const [currentPlayer, setCurrentPlayer] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const val = params.get('player') || 'All Players';
    return ALL_PLAYERS.includes(val) ? val : 'All Players';
  })
  const [sortField, setSortField] = useState<SortField>(() => {
    const params = new URLSearchParams(window.location.search);
    const val = params.get('sort') as SortField;
    return VALID_SORT_FIELDS.includes(val) ? val : 'name';
  })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const params = new URLSearchParams(window.location.search);
    const val = params.get('order');
    return val === 'asc' || val === 'desc' ? val : 'asc';
  })

  const [showDemoViewer, setShowDemoViewer] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!params.get('demo');
  });
  const [hasLoadedDemoViewer, setHasLoadedDemoViewer] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!params.get('demo');
  });
  const [pendingDemo, setPendingDemo] = useState<{url: string, name: string} | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const demoName = params.get('demo');
    if (demoName) {
      const demoUrl = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/demos/${encodeURIComponent(demoName)}`;
      return { url: demoUrl, name: demoName };
    }
    return null;
  });

  const closeViewer = useCallback(() => {
    setShowDemoViewer(false);
    setPendingDemo(null);
  }, []);

  const handlePlayDemo = (e: React.MouseEvent, mapName: string, player: string, time: number) => {
    e.stopPropagation();
    const demoName = `${mapName}_${time.toFixed(3)}_${player}.demo`;
    const demoUrl = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/demos/${encodeURIComponent(demoName)}`;
    
    setPendingDemo({ url: demoUrl, name: demoName });
    setHasLoadedDemoViewer(true);
    setShowDemoViewer(true);
  };

  const [hoveredMap, setHoveredMap] = useState<{name: string, difficulty: string} | null>(null);
  const [hoverY, setHoverY] = useState<number>(0);
  const [selectedMap, setSelectedMap] = useState<{name: string, difficulty: string} | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const mapName = params.get('preview');
    if (mapName) {
      const map = data.maps.find(m => m.name === mapName);
      if (map) return { name: map.name, difficulty: map.difficulty };
    }
    return null;
  });
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (diffFilter !== 'All') params.set('diff', diffFilter);
    if (lengthFilter !== 'All') params.set('length', lengthFilter);
    if (statusFilter !== 'All') params.set('status', statusFilter);
    if (currentPlayer !== 'All Players') params.set('player', currentPlayer);
    if (sortField !== 'name') params.set('sort', sortField);
    if (sortOrder !== 'asc') params.set('order', sortOrder);
    if (selectedMap) params.set('preview', selectedMap.name);
    if (pendingDemo) params.set('demo', pendingDemo.name);

    const queryString = params.toString();
    const newRelativePathQuery = window.location.pathname + (queryString ? '?' + queryString : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [search, diffFilter, lengthFilter, statusFilter, currentPlayer, sortField, sortOrder, selectedMap, pendingDemo]);

  const difficulties = DIFFICULTIES;
  const allPlayers = ALL_PLAYERS;

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
        const matchesLength = lengthFilter === 'All' || m.length === lengthFilter;
        
        const mapProgress = data.progress[m.name] || {};
        const isFinishedByCurrent = currentPlayer === 'All Players' 
          ? Object.keys(mapProgress).length > 0 
          : !!mapProgress[currentPlayer];

        const matchesStatus = statusFilter === 'All' || 
                             (statusFilter === 'Finished' && isFinishedByCurrent) || 
                             (statusFilter === 'Pending' && !isFinishedByCurrent);
        
        return matchesSearch && matchesDiff && matchesLength && matchesStatus;
      })
      .sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortField === 'time') {
          valA = getMapTime(a.name);
          valB = getMapTime(b.name);
        } else if (sortField === 'difficulty') {
          valA = DIFFICULTIES.indexOf(a.difficulty);
          valB = DIFFICULTIES.indexOf(b.difficulty);
        } else if (sortField === 'length') {
          valA = LENGTH_ORDER.indexOf(a.length);
          valB = LENGTH_ORDER.indexOf(b.length);
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
  }, [search, diffFilter, lengthFilter, statusFilter, sortField, sortOrder, currentPlayer]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'time' ? 'asc' : 'asc'); // Usually want fastest first
    }
  }

  const handleMouseEnter = (e: React.MouseEvent, name: string, difficulty: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = rect.top + rect.height / 2;

    if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);

    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoverY(y);
      setHoveredMap({ name, difficulty });
    }, 50);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);

    // Delay unmounting slightly so user can move mouse to the preview itself
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredMap(null);
    }, 100);
  };
  const stats = useMemo(() => {
    let finished = 0;
    let points = 0;
    let total = 0;
    
    data.maps.forEach(m => {
      if (diffFilter !== 'All' && m.difficulty !== diffFilter) return;
      if (lengthFilter !== 'All' && m.length !== lengthFilter) return;
      
      total++;
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
      total,
      percent: total > 0 ? ((finished / total) * 100).toFixed(1) : '0.0',
      points
    }
  }, [currentPlayer, diffFilter, lengthFilter]);

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

            <div className="filter-group">
              <Clock size={16} />
              <select value={lengthFilter} onChange={(e) => setLengthFilter(e.target.value)}>
                {LENGTHS.map(l => <option key={l} value={l}>{l === 'All' ? 'All Lengths' : l}</option>)}
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
              <th onClick={() => toggleSort('length')} className="sortable">
                Length {sortField === 'length' && (sortOrder === 'asc' ? <SortAsc size={14}/> : <SortDesc size={14}/>)}
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
                  <td 
                    className="font-bold map-cell"
                    onMouseEnter={(e) => handleMouseEnter(e, map.name, map.difficulty)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => setSelectedMap({ name: map.name, difficulty: map.difficulty })}
                  >
                    <div className="map-name-wrapper">
                      {map.name}
                      <Maximize2 size={12} className="preview-icon" />
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${map.difficulty.toLowerCase()}`}>
                      {map.difficulty}
                    </span>
                  </td>
                  <td className="stars">{map.stars}</td>
                  <td className="font-mono">{map.points}</td>
                  <td className="font-mono text-center">{map.length}</td>
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
                              <button 
                                className="play-demo-btn" 
                                onClick={(e) => handlePlayDemo(e, map.name, player, time)}
                                title="Play Demo"
                              >
                                <PlayCircle size={12} />
                              </button>
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

      {hoveredMap && !selectedMap && (
        <div 
          className="hover-preview-fixed" 
          style={{ transform: `translate3d(0, ${hoverY}px, 0) translateY(-50%)` }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
          onClick={() => setSelectedMap(hoveredMap)}
        >
          <MapPreview mapName={hoveredMap.name} difficulty={hoveredMap.difficulty} />
        </div>
      )}

      {selectedMap && (
        <MapPreview 
          mapName={selectedMap.name} 
          difficulty={selectedMap.difficulty}
          isFull={true} 
          onClose={() => setSelectedMap(null)} 
        />
      )}

      <DemoViewer
        show={showDemoViewer}
        hasLoaded={hasLoadedDemoViewer}
        pendingDemo={pendingDemo}
        onClose={closeViewer}
      />
    </div>
  )
}

export default App
