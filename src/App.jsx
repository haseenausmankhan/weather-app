import React, { useState, useEffect } from 'react';
import { Search, Wind, Droplets, Thermometer, Calendar, Info, MapPin, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWeather, getHistoricalWeather, getAutocompleteSuggestions, getForecast } from './services/weatherApi';

function App() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState(null);
  const [history, setHistory] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'history', 'forecast', 'features'
  const [historyDate, setHistoryDate] = useState('');

  const fetchWeather = async (cityName) => {
    const searchCity = cityName || query;
    if (!searchCity || !searchCity.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCurrentWeather(searchCity);
      if (data && data.location) {
        setWeather(data);
        setSuggestions([]);
        setQuery(data.location.name); // Sync query state with actual location
      } else if (data && data.error) {
        throw new Error(data.error.info || 'City not found');
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err.response?.data?.error?.info || err.message || 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    const searchCity = query.trim();
    if (!searchCity) {
      setError('Please enter a city name first');
      return;
    }
    if (!historyDate) {
      setError('Please select a date');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getHistoricalWeather(searchCity, historyDate);
      if (data && data.location) {
        setHistory({ ...data, isMock: false });
      } else if (data && data.error) {
        throw new Error(data.error.info || 'Historical data not found');
      }
    } catch (err) {
      console.error('History fetch error:', err);
      const isRestricted = err.response?.status === 400 ||
        err.response?.status === 403 ||
        err.message?.includes('400') ||
        err.message?.includes('403') ||
        err.message?.toLowerCase().includes('restricted');

      if (isRestricted) {
        // Fallback to Mock Data for demonstration
        const mockData = {
          location: { name: searchCity, country: 'Demo Mode' },
          historical: {
            [historyDate]: {
              date: historyDate,
              avgtemp: Math.floor(Math.random() * 15) + 15,
              mintemp: Math.floor(Math.random() * 10) + 5,
              maxtemp: Math.floor(Math.random() * 10) + 25,
              sunhour: (Math.random() * 5 + 5).toFixed(1),
              totalsnow_cm: "0.0"
            }
          },
          isMock: true
        };
        setHistory(mockData);
        setError(null); // Clear error since we are showing mock data
      } else {
        setError(err.response?.data?.error?.info || err.message || 'Failed to fetch historical weather');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchForecast = async () => {
    const searchCity = query.trim();
    if (!searchCity) {
      setError('Please enter a city name first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getForecast(searchCity);
      if (data && data.location) {
        setForecast({ ...data, isMock: false });
      } else if (data && data.error) {
        throw new Error(data.error.info || 'Forecast data not found');
      }
    } catch (err) {
      console.error('Forecast fetch error:', err);
      // Include 403 Forbidden which is common for plan restrictions
      const isRestricted = err.response?.status === 400 ||
        err.response?.status === 403 ||
        err.message?.includes('400') ||
        err.message?.includes('403') ||
        err.message?.toLowerCase().includes('restricted');

      if (isRestricted) {
        // Fallback to Mock Data for demonstration
        const mockDays = [];
        const today = new Date();
        for (let i = 1; i <= 5; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          mockDays.push({
            date: d.toISOString().split('T')[0],
            avgtemp: Math.floor(Math.random() * 10) + 20,
            weather_descriptions: ['Partly Cloudy'],
            weather_icons: ['https://cdn.worldweatheronline.com/images/wsymbols01_png_64/wsymbol_0002_sunny_intervals.png']
          });
        }
        setForecast({
          location: { name: searchCity, country: 'Demo Mode' },
          forecast: mockDays.reduce((acc, curr) => ({ ...acc, [curr.date]: curr }), {}),
          isMock: true
        });
        setError(null);
      } else {
        setError(err.response?.data?.error?.info || err.message || 'Failed to fetch forecast');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) fetchWeather();
  };

  const handleInputChange = async (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length > 2) {
      try {
        const data = await getAutocompleteSuggestions(val);
        setSuggestions(data.results || []);
      } catch (err) {
        // Silently fail for autocomplete as it's often not supported on free/standard plans
        console.warn('Autocomplete not supported or failed:', err.message);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    fetchWeather('New York'); // Initial load
  }, []);

  return (
    <div className="glass-container">
      <header className="flex flex-col items-center mb-8">
        <h1 className="text-4xl font-bold mb-4 tracking-tight flex items-center gap-2">
          <Wind className="text-blue-400" /> WeatherGlass
        </h1>

        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <input
            type="text"
            className="input-glass pr-12"
            placeholder="Search city..."
            value={query}
            onChange={handleInputChange}
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:text-blue-400 transition-colors">
            <Search size={20} />
          </button>

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute w-full mt-2 bg-slate-800/90 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden z-50 shadow-2xl"
              >
                {suggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className="px-4 py-2 hover:bg-white/10 cursor-pointer transition-colors"
                    onClick={() => {
                      setQuery(suggestion.name);
                      fetchWeather(suggestion.name);
                    }}
                  >
                    {suggestion.name}, {suggestion.country}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </form>
      </header>

      <nav className="flex justify-center flex-wrap gap-4 mb-8">
        {['current', 'history', 'forecast', 'features'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <main>
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-center mb-6"
          >
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'current' && weather && (
            <motion.section
              key="current"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="glass-card flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <MapPin size={16} /> {weather.location.name}, {weather.location.country}
                </div>
                <img src={weather.current.weather_icons[0]} alt="weather icon" className="w-24 h-24 mb-4 filter drop-shadow-lg" />
                <div className="text-6xl font-bold">{weather.current.temperature}°</div>
                <div className="text-xl text-slate-300 capitalize mt-2">{weather.current.weather_descriptions[0]}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card flex flex-col items-center justify-center">
                  <Wind className="text-slate-400 mb-2" />
                  <div className="text-sm text-slate-400">Wind Speed</div>
                  <div className="text-xl font-bold">{weather.current.wind_speed} km/h</div>
                </div>
                <div className="glass-card flex flex-col items-center justify-center">
                  <Droplets className="text-slate-400 mb-2" />
                  <div className="text-sm text-slate-400">Humidity</div>
                  <div className="text-xl font-bold">{weather.current.humidity}%</div>
                </div>
                <div className="glass-card flex flex-col items-center justify-center">
                  <Thermometer className="text-slate-400 mb-2" />
                  <div className="text-sm text-slate-400">Feels Like</div>
                  <div className="text-xl font-bold">{weather.current.feelslike}°</div>
                </div>
                <div className="glass-card flex flex-col items-center justify-center">
                  <Info className="text-slate-400 mb-2" />
                  <div className="text-sm text-slate-400">UV Index</div>
                  <div className="text-xl font-bold">{weather.current.uv_index}</div>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'history' && (
            <motion.section
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="flex gap-4 mb-8 w-full max-w-md">
                <input
                  type="date"
                  className="input-glass"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                />
                <button onClick={fetchHistory} className="btn-glass flex items-center gap-2">
                  <History size={18} /> Get History
                </button>
              </div>

              {history ? (
                <div className="glass-card w-full">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Historical Data for {history.location.name}</h3>
                    {history.isMock && (
                      <span className="bg-amber-500/20 text-amber-200 text-xs px-3 py-1 rounded-full border border-amber-500/30">
                        Demo Mode (Mock Data)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card bg-white/5 text-center p-6">
                      <div className="text-slate-400 text-sm mb-2">Avg Temp</div>
                      <div className="text-4xl font-bold">{history.historical?.[historyDate]?.avgtemp || '--'}°</div>
                    </div>
                    <div className="glass-card bg-white/5 text-center p-6">
                      <div className="text-slate-400 text-sm mb-2">Min / Max</div>
                      <div className="text-2xl font-bold">
                        {history.historical?.[historyDate]?.mintemp || '--'}° / {history.historical?.[historyDate]?.maxtemp || '--'}°
                      </div>
                    </div>
                    <div className="glass-card bg-white/5 text-center p-6">
                      <div className="text-slate-400 text-sm mb-2">Sun Hours</div>
                      <div className="text-4xl font-bold">{history.historical?.[historyDate]?.sunhour || '--'}h</div>
                    </div>
                  </div>

                  {history.isMock && (
                    <p className="text-xs text-slate-500 mt-6 text-center italic">
                      Note: Your current API plan restricts historical data. Showing generated data for UI demonstration.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 py-20 text-center">
                  Select a date and click "Get History". <br />
                  <span className="text-sm">(Note: Only available on paid plans)</span>
                </div>
              )}
            </motion.section>
          )}

          {activeTab === 'forecast' && (
            <motion.section
              key="forecast"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="flex justify-center mb-8">
                <button onClick={fetchForecast} className="btn-glass flex items-center gap-2">
                  <Calendar size={18} /> Get 5-Day Forecast
                </button>
              </div>

              {forecast ? (
                <div className="w-full">
                  <div className="flex justify-between items-center mb-6 px-4">
                    <h3 className="text-xl font-bold">Forecast for {forecast.location.name}</h3>
                    {forecast.isMock && (
                      <span className="bg-amber-500/20 text-amber-200 text-xs px-3 py-1 rounded-full border border-amber-500/30">
                        Demo Mode (Mock Data)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.values(forecast.forecast).map((day, idx) => (
                      <div key={idx} className="glass-card flex flex-col items-center p-4">
                        <div className="text-sm text-slate-400 mb-2">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <img src={day.weather_icons[0]} alt="weather icon" className="w-12 h-12 mb-2 filter drop-shadow-md" />
                        <div className="text-2xl font-bold">{day.avgtemp}°</div>
                        <div className="text-xs text-slate-300 mt-1">{day.weather_descriptions[0]}</div>
                      </div>
                    ))}
                  </div>

                  {forecast.isMock && (
                    <p className="text-xs text-slate-500 mt-6 text-center italic">
                      Note: Your current API plan restricts forecast data. Showing generated data for UI demonstration.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 py-20 text-center">
                  Click the button to load the forecast. <br />
                  <span className="text-sm">(Note: Only available on paid plans)</span>
                </div>
              )}
            </motion.section>
          )}

          {activeTab === 'features' && (
            <motion.section
              key="features"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="glass-card">
                <h3 className="font-bold mb-2 flex items-center gap-2"><MapPin size={18} /> Reverse Geocoding</h3>
                <p className="text-sm text-slate-400">Lookup weather for coordinates or IP addresses.</p>
              </div>
              <div className="glass-card">
                <h3 className="font-bold mb-2 flex items-center gap-2"><Calendar size={18} /> Forecast Data</h3>
                <p className="text-sm text-slate-400">Get up to 14 days of detailed weather forecasts.</p>
              </div>
              <div className="glass-card">
                <h3 className="font-bold mb-2 flex items-center gap-2"><Wind size={18} /> Marine Weather</h3>
                <p className="text-sm text-slate-400">Detailed sea level and tide information.</p>
              </div>
              <div className="glass-card">
                <h3 className="font-bold mb-2 flex items-center gap-2"><Search size={18} /> Location Autocomplete</h3>
                <p className="text-sm text-slate-400">Search from millions of global cities as you type.</p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 text-center text-slate-500 text-sm">
        Powered by Weatherstack API • Built with React & Glassmorphism
      </footer>
    </div>
  );
}

export default App;
