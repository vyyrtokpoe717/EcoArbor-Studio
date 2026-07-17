'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { jsPDF } from 'jspdf';
import { 
  Download, 
  Plus, 
  Wind, 
  Droplets, 
  Leaf, 
  Activity, 
  Info, 
  TreeDeciduous, 
  Trash2, 
  BookOpen, 
  Sparkles, 
  Calculator, 
  Layers, 
  Eye,
  CheckCircle,
  HelpCircle,
  CloudSun,
  MapPin,
  Compass,
  Thermometer,
  RefreshCw,
  AlertTriangle,
  Search,
  ChevronDown,
  Calendar,
  Clock,
  TrendingUp,
  X,
  RotateCcw
} from 'lucide-react';

type Species = {
  id: string;
  name: string;
  scientificName: string;
  type: 'Conifer' | 'Broadleaf';
  equationType: 'power' | 'exp';
  a: number;
  b: number;
  lai: number; // m²/m²
  sc: number; // mm
  baseVd: number; // m/s
  mathStr: string;
  family: string;
  habitat: string;
  description: string;
  foliageColor: string;
  trunkColor: string;
};

const speciesData: Species[] = [
  {
    id: 'deodar-cedar',
    name: 'Deodar Cedar',
    scientificName: 'Cedrus deodara',
    type: 'Conifer',
    equationType: 'power',
    a: 0.0782,
    b: 2.4180,
    lai: 6.8,
    sc: 2.2,
    baseVd: 0.0072,
    mathStr: 'M = 0.0782 * (DBH ^ 2.4180)',
    family: 'Pinaceae',
    habitat: 'Western Himalayas (high elevation, montane temperate forests)',
    description: 'National tree of Pakistan. Highly resilient evergreen conifer with drooping branches and dense needle clumps that create massive turbulent airflow, maximizing particulate capture.',
    foliageColor: '#0f5132',
    trunkColor: '#5c4033'
  },
  {
    id: 'kashmir-blue-pine',
    name: 'Kashmir Blue Pine',
    scientificName: 'Pinus wallichiana',
    type: 'Conifer',
    equationType: 'power',
    a: 0.0815,
    b: 2.3980,
    lai: 6.0,
    sc: 1.8,
    baseVd: 0.0062,
    mathStr: 'M = 0.0815 * (DBH ^ 2.3980)',
    family: 'Pinaceae',
    habitat: 'Himalayan mountain valleys, Kashmir and northern South Asia',
    description: 'Distinctive pine with graceful, drooping blue-green needles. Possesses excellent stormwater storage attributes and highly efficient aerodynamic particulate dry deposition.',
    foliageColor: '#194d33',
    trunkColor: '#4d3319'
  },
  {
    id: 'sacred-fig',
    name: 'Sacred Fig / Peepal',
    scientificName: 'Ficus religiosa',
    type: 'Broadleaf',
    equationType: 'exp',
    a: -2.1550,
    b: 2.4410,
    lai: 5.2,
    sc: 1.4,
    baseVd: 0.0022,
    mathStr: 'M = exp(-2.1550 + 2.4410 * ln(DBH))',
    family: 'Moraceae',
    habitat: 'Indian subcontinent, tropical and subtropical plains',
    description: 'A deeply sacred broadleaf tree of cultural significance. Characterized by wide, heart-shaped leaves with long, slender tips that dance in light winds and catch high volumes of rainfall.',
    foliageColor: '#1e4620',
    trunkColor: '#6f5a48'
  },
  {
    id: 'teak',
    name: 'Teak',
    scientificName: 'Tectona grandis',
    type: 'Broadleaf',
    equationType: 'power',
    a: 0.1140,
    b: 2.3840,
    lai: 4.0,
    sc: 1.1,
    baseVd: 0.0016,
    mathStr: 'M = 0.1140 * (DBH ^ 2.3840)',
    family: 'Lamiaceae',
    habitat: 'Monsoonal deciduous forests of India and Southeast Asia',
    description: 'Renowned tropical hardwood with massive, coarse textured leaves and exceptional timber durability. Highly effective at locking carbon long-term in heavy dense wood structures.',
    foliageColor: '#2d5a27',
    trunkColor: '#8a6a4a'
  },
  {
    id: 'northern-red-oak',
    name: 'Northern Red Oak',
    scientificName: 'Quercus rubra',
    type: 'Broadleaf',
    equationType: 'exp',
    a: -2.0127,
    b: 2.4342,
    lai: 4.8,
    sc: 1.2,
    baseVd: 0.0018,
    mathStr: 'M = exp(-2.0127 + 2.4342 * ln(DBH))',
    family: 'Fagaceae',
    habitat: 'North American temperate forests, widely introduced globally',
    description: 'A majestic fast-growing hardwood. It features deeply lobed, broad leaves that create high Leaf Area Index values and solid rain interception profiles in temperate zones.',
    foliageColor: '#1d5a2a',
    trunkColor: '#4a413d'
  }
];

type LoggedTree = {
  id: string;
  speciesId: string;
  speciesName: string;
  scientificName: string;
  dbh: number;
  canopyDiameter: number;
  canopyArea: number;
  co2e: number;
  pm25: number;
  stormwater: number;
  timestamp: string;
};

export default function EcoArborApp() {
  const [mounted, setMounted] = useState(false);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>(speciesData[0].id);
  const [dbh, setDbh] = useState<number>(40);
  const [canopyDiameter, setCanopyDiameter] = useState<number>(8);
  const [pm25, setPm25] = useState<number>(42);
  const [windSpeed, setWindSpeed] = useState<number>(2.8);
  
  // Field Log State
  const [logs, setLogs] = useState<LoggedTree[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [inspectingMetric, setInspectingMetric] = useState<'carbon' | 'air' | 'hydrology' | null>(null);
  const [chartMetric, setChartMetric] = useState<'carbon' | 'pm25' | 'stormwater'>('carbon');

  // Seasonal State Toggle
  const [seasonalMode, setSeasonalMode] = useState<'summer' | 'winter'>('summer');

  // Custom Dropdown & Filtering States
  const [isSpeciesDropdownOpen, setIsSpeciesDropdownOpen] = useState(false);
  const [speciesSearchQuery, setSpeciesSearchQuery] = useState('');
  const [speciesTypeFilter, setSpeciesTypeFilter] = useState<'All' | 'Conifer' | 'Broadleaf'>('All');

  // Undo Delete Toast States
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [recentlyDeletedLog, setRecentlyDeletedLog] = useState<{ log: LoggedTree; index: number } | null>(null);

  // Live Location and Weather/AQI state - preloaded with FRI Dehradun metrics for instant loading
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lon: number } | null>({ lat: 30.3165, lon: 78.0322 });
  const [liveLocationName, setLiveLocationName] = useState<string>('Dehradun, India (FRI HQ)');
  const [weatherData, setWeatherData] = useState<{
    temp: number;
    windSpeed: number;
    windDir: number;
    pm25: number;
    co: number;
    ozone: number;
  } | null>({
    temp: 24.5,
    windSpeed: 2.8,
    windDir: 120,
    pm25: 42.0,
    co: 280,
    ozone: 34.2
  });
  const [loadingLive, setLoadingLive] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>('');

  // Hydrate states from localStorage safely on client mount to prevent hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    try {
      const cachedLogs = localStorage.getItem('ecoarbor_logs');
      if (cachedLogs) {
        const parsed = JSON.parse(cachedLogs);
        setLogs(parsed);
        setSelectedLogIds(parsed.map((log: LoggedTree) => log.id));
      }
      
      const cachedSpecies = localStorage.getItem('ecoarbor_selectedSpeciesId');
      if (cachedSpecies) setSelectedSpeciesId(cachedSpecies);
      
      const cachedDbh = localStorage.getItem('ecoarbor_dbh');
      if (cachedDbh) setDbh(parseFloat(cachedDbh));
      
      const cachedCanopy = localStorage.getItem('ecoarbor_canopyDiameter');
      if (cachedCanopy) setCanopyDiameter(parseFloat(cachedCanopy));
      
      const cachedPm25 = localStorage.getItem('ecoarbor_pm25');
      if (cachedPm25) setPm25(parseInt(cachedPm25, 10));
      
      const cachedWind = localStorage.getItem('ecoarbor_windSpeed');
      if (cachedWind) setWindSpeed(parseFloat(cachedWind));
      
      const cachedSeason = localStorage.getItem('ecoarbor_seasonalMode');
      if (cachedSeason && (cachedSeason === 'summer' || cachedSeason === 'winter')) {
        setSeasonalMode(cachedSeason as 'summer' | 'winter');
      }
      
      const cachedLoc = localStorage.getItem('ecoarbor_liveLocation');
      if (cachedLoc) setLiveLocation(JSON.parse(cachedLoc));
      
      const cachedLocName = localStorage.getItem('ecoarbor_liveLocationName');
      if (cachedLocName) setLiveLocationName(cachedLocName);
      
      const cachedWeather = localStorage.getItem('ecoarbor_weatherData');
      if (cachedWeather) setWeatherData(JSON.parse(cachedWeather));
    } catch (e) {
      console.error("Failed to hydrate from localStorage", e);
    }
  }, []);

  // Persist logs when they change
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('ecoarbor_logs', JSON.stringify(logs));
    } catch {}
  }, [logs, mounted]);

  // Persist interactive configurations when they change
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('ecoarbor_selectedSpeciesId', selectedSpeciesId);
      localStorage.setItem('ecoarbor_dbh', dbh.toString());
      localStorage.setItem('ecoarbor_canopyDiameter', canopyDiameter.toString());
      localStorage.setItem('ecoarbor_pm25', pm25.toString());
      localStorage.setItem('ecoarbor_windSpeed', windSpeed.toString());
      localStorage.setItem('ecoarbor_seasonalMode', seasonalMode);
      if (liveLocation) localStorage.setItem('ecoarbor_liveLocation', JSON.stringify(liveLocation));
      if (liveLocationName) localStorage.setItem('ecoarbor_liveLocationName', liveLocationName);
      if (weatherData) localStorage.setItem('ecoarbor_weatherData', JSON.stringify(weatherData));
    } catch {}
  }, [selectedSpeciesId, dbh, canopyDiameter, pm25, windSpeed, seasonalMode, liveLocation, liveLocationName, weatherData, mounted]);

  const getCompassDirection = (deg: number) => {
    const index = Math.round(((deg % 360) / 45)) % 8;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[index];
  };

  const fetchTelemetry = useCallback(async (lat: number, lon: number, locationLabel?: string, silent: boolean = false) => {
    if (!silent) {
      setLoadingLive(true);
      setLiveError(null);
    }
    setLiveLocation({ lat, lon });
    
    if (locationLabel) {
      setLiveLocationName(locationLabel);
    } else {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
          headers: { 'Accept-Language': 'en' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county || '';
            const country = data.address.country || '';
            setLiveLocationName(city ? `${city}, ${country}` : country || 'Unknown Area');
          } else {
            setLiveLocationName(`${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
          }
        } else {
          setLiveLocationName(`${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
        }
      } catch {
        setLiveLocationName(`${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
      }
    }

    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m`;
      const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,carbon_monoxide,ozone`;

      const [weatherRes, aqRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(aqUrl)
      ]);

      if (!weatherRes.ok || !aqRes.ok) {
        throw new Error('Failed to retrieve atmospheric telemetry.');
      }

      const weatherJson = await weatherRes.json();
      const aqJson = await aqRes.json();

      const rawWindSpeed = weatherJson.current.wind_speed_10m;
      const windMPS = Number((rawWindSpeed / 3.6).toFixed(1));

      const parsedWeather = {
        temp: weatherJson.current.temperature_2m,
        windSpeed: windMPS,
        windDir: weatherJson.current.wind_direction_10m,
        pm25: aqJson.current.pm2_5,
        co: aqJson.current.carbon_monoxide,
        ozone: aqJson.current.ozone
      };

      setWeatherData(parsedWeather);
      
      setPm25(Math.max(5, Math.min(300, Math.round(parsedWeather.pm25))));
      setWindSpeed(Math.max(1, Math.min(12, windMPS)));
      setIsSynced(true);
    } catch (err: any) {
      if (!silent) {
        setLiveError(err.message || 'Error fetching telemetry.');
      }
    } finally {
      if (!silent) {
        setLoadingLive(false);
      }
    }
  }, []);

  const fetchIPFallback = useCallback(async (silent: boolean = false) => {
    // Attempt 1: ipwho.is (extremely accurate free tier API)
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const label = data.city ? `${data.city}, ${data.country || ''}` : `${data.country || 'IP Location'}`;
          await fetchTelemetry(data.latitude, data.longitude, label + ' (IP detected)', silent);
          return;
        }
      }
    } catch {
      // quiet fallback
    }

    // Attempt 2: freeipapi.com (reliable backup)
    try {
      const res = await fetch('https://freeipapi.com/api/json');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const label = data.cityName ? `${data.cityName}, ${data.countryName || ''}` : `${data.countryName || 'IP Location'}`;
          await fetchTelemetry(data.latitude, data.longitude, label + ' (IP detected)', silent);
          return;
        }
      }
    } catch {
      // quiet fallback
    }

    // Attempt 3: ipapi.co (standard fallback)
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const label = data.city ? `${data.city}, ${data.country_name || ''}` : `${data.country_name || 'IP Location'}`;
          await fetchTelemetry(data.latitude, data.longitude, label + ' (IP detected)', silent);
          return;
        }
      }
    } catch {
      // quiet fallback
    }

    // Attempt 4: Ultimate static fallback (FRI HQ, India)
    await fetchTelemetry(30.3165, 78.0322, 'Dehradun, India (FRI HQ)', silent);
  }, [fetchTelemetry]);

  useEffect(() => {
    if (!mounted) return;

    // Only auto-locate on startup if we don't have cached telemetry already!
    const hasCachedTelemetry = localStorage.getItem('ecoarbor_weatherData');
    if (hasCachedTelemetry) return;

    const timer = setTimeout(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            fetchTelemetry(lat, lon, 'Device Location', true); // Silent background fetch
          },
          () => {
            fetchIPFallback(true); // Silent background fetch
          },
          { timeout: 7000, enableHighAccuracy: true }
        );
      } else {
        fetchIPFallback(true); // Silent background fetch
      }
    }, 500); // slight delay to prioritize initial layout render

    return () => clearTimeout(timer);
  }, [mounted, fetchTelemetry, fetchIPFallback]);

  const handleManualSync = () => {
    setLoadingLive(true);
    setLiveError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          fetchTelemetry(lat, lon, 'Device Location');
        },
        () => {
          fetchIPFallback();
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      fetchIPFallback();
    }
  };

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSearchQuery.trim()) return;
    setLoadingLive(true);
    setLiveError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearchQuery)}&format=json&limit=3&accept-language=en`);
      if (!res.ok) {
        throw new Error('Search request failed. Please try again.');
      }
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const displayName = item.display_name;
        // Format beautifully: take first few items of address to avoid extremely long labels
        const parts = displayName.split(',');
        const shortLabel = parts.slice(0, 3).join(',').trim();
        await fetchTelemetry(lat, lon, shortLabel);
        setLocationSearchQuery('');
      } else {
        throw new Error('Location not found. Please specify a city or region.');
      }
    } catch (err: any) {
      setLiveError(err.message || 'Error searching location.');
      setLoadingLive(false);
    }
  };

  const activeSpecies = useMemo(() => speciesData.find(s => s.id === selectedSpeciesId) || speciesData[0], [selectedSpeciesId]);

  // Real scientific equations computed dynamically without placeholders
  const metrics = useMemo(() => {
    // Determine active LAI and Sc based on Seasonality
    const activeLai = (seasonalMode === 'winter' && activeSpecies.type === 'Broadleaf') ? 0.1 : activeSpecies.lai;
    const activeSc = (seasonalMode === 'winter' && activeSpecies.type === 'Broadleaf') ? activeSpecies.sc * 0.3 : activeSpecies.sc;

    // A. Aboveground Dry Biomass (M, in kg)
    let M = 0;
    if (activeSpecies.equationType === 'power') {
      M = activeSpecies.a * Math.pow(dbh, activeSpecies.b);
    } else {
      M = Math.exp(activeSpecies.a + activeSpecies.b * Math.log(dbh));
    }

    // B. Carbon storage and CO2e
    const carbonContent = M * 0.50; // assuming 50% of dry wood biomass is carbon
    const co2e = carbonContent * (44.01 / 12.011); // ratio of CO2 to C weight

    // C. Canopy Area (A, m²)
    const canopyArea = Math.PI * Math.pow(canopyDiameter / 2, 2);

    // Wind adjusted deposition velocity Vd (m/s)
    let vdMPS = 0;
    if (activeSpecies.type === 'Conifer') {
      vdMPS = activeSpecies.baseVd + (0.0005 * windSpeed);
    } else {
      vdMPS = activeSpecies.baseVd + (0.0002 * windSpeed);
    }
    const vdPerHour = vdMPS * 3600; // convert to m/hr

    // Ambient concentration C (converted from ug/m3 to g/m3)
    const cGperM3 = pm25 * 1e-6;

    // Deposition flux F = Vd * C (g/m²/hr)
    const F = vdPerHour * cGperM3;

    // Total Mass Intercepted P = F * LAI * A * 1000 (mg/hour)
    const pm25Intercepted = F * activeLai * canopyArea * 1000;

    // D. Canopy Stormwater Interception (I, Liters)
    // I = Sc * LAI * A
    const stormwater = activeSc * activeLai * canopyArea;

    return {
      biomass: M,
      carbonContent,
      co2e,
      canopyArea,
      vdMPS,
      vdPerHour,
      flux: F,
      pm25Intercepted,
      stormwater,
      activeLai,
      activeSc
    };
  }, [activeSpecies, dbh, canopyDiameter, pm25, windSpeed, seasonalMode]);

  // Dynamic Botanical Growth Forecaster
  const growthProjections = useMemo(() => {
    let dbhGrowthPerYear = 0.8; 
    if (activeSpecies.family.includes('Moraceae') || activeSpecies.name.includes('Fig')) {
      dbhGrowthPerYear = 1.2; 
    } else if (activeSpecies.name.includes('Cedar') || activeSpecies.name.includes('Pine')) {
      dbhGrowthPerYear = 0.6; 
    } else if (activeSpecies.name.includes('Teak') || activeSpecies.name.includes('Oak')) {
      dbhGrowthPerYear = 0.95; 
    }

    const canopyGrowthPerYear = dbhGrowthPerYear * 0.2; 

    const getMetricsForDimensions = (projectedDbh: number, projectedCanopyDiam: number) => {
      let M = 0;
      if (activeSpecies.equationType === 'power') {
        M = activeSpecies.a * Math.pow(projectedDbh, activeSpecies.b);
      } else {
        M = Math.exp(activeSpecies.a + activeSpecies.b * Math.log(projectedDbh));
      }
      const carbonContent = M * 0.50;
      const co2e = carbonContent * (44.01 / 12.011);
      const canopyArea = Math.PI * Math.pow(projectedCanopyDiam / 2, 2);

      const activeLai = (seasonalMode === 'winter' && activeSpecies.type === 'Broadleaf') ? 0.1 : activeSpecies.lai;
      const activeSc = (seasonalMode === 'winter' && activeSpecies.type === 'Broadleaf') ? activeSpecies.sc * 0.3 : activeSpecies.sc;

      let vdMPS = 0;
      if (activeSpecies.type === 'Conifer') {
        vdMPS = activeSpecies.baseVd + (0.0005 * windSpeed);
      } else {
        vdMPS = activeSpecies.baseVd + (0.0002 * windSpeed);
      }
      const vdPerHour = vdMPS * 3600;
      const cGperM3 = pm25 * 1e-6;
      const F = vdPerHour * cGperM3;
      const pm25Intercepted = F * activeLai * canopyArea * 1000;
      const stormwater = activeSc * activeLai * canopyArea;

      return { dbh: projectedDbh, canopyDiameter: projectedCanopyDiam, co2e, pm25: pm25Intercepted, stormwater };
    };

    return [
      { year: 10, ...getMetricsForDimensions(dbh + dbhGrowthPerYear * 10, canopyDiameter + canopyGrowthPerYear * 10) },
      { year: 20, ...getMetricsForDimensions(dbh + dbhGrowthPerYear * 20, canopyDiameter + canopyGrowthPerYear * 20) },
      { year: 50, ...getMetricsForDimensions(dbh + dbhGrowthPerYear * 50, canopyDiameter + canopyGrowthPerYear * 50) },
    ];
  }, [activeSpecies, dbh, canopyDiameter, pm25, windSpeed, seasonalMode]);

  // Totals for logged items (Arbor Stand Synthesis)
  const standTotals = useMemo(() => {
    return logs.reduce((acc, log) => {
      acc.co2e += log.co2e;
      acc.pm25 += log.pm25;
      acc.stormwater += log.stormwater;
      acc.count += 1;
      return acc;
    }, { co2e: 0, pm25: 0, stormwater: 0, count: 0 });
  }, [logs]);

  // Selected totals for comparative chart (Arbor Stand Selected Synthesis)
  const selectedTotals = useMemo(() => {
    return logs.filter(log => selectedLogIds.includes(log.id)).reduce((acc, log) => {
      acc.co2e += log.co2e;
      acc.pm25 += log.pm25;
      acc.stormwater += log.stormwater;
      acc.count += 1;
      return acc;
    }, { co2e: 0, pm25: 0, stormwater: 0, count: 0 });
  }, [logs, selectedLogIds]);

  const handleLogTree = () => {
    const newLog: LoggedTree = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      speciesId: activeSpecies.id,
      speciesName: activeSpecies.name,
      scientificName: activeSpecies.scientificName,
      dbh,
      canopyDiameter,
      canopyArea: metrics.canopyArea,
      co2e: metrics.co2e,
      pm25: metrics.pm25Intercepted,
      stormwater: metrics.stormwater,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setLogs(prev => [newLog, ...prev]);
    setSelectedLogIds(prev => [newLog.id, ...prev]);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setSelectedLogIds([]);
  };

  const handleDeleteLog = (id: string) => {
    const deletedIndex = logs.findIndex(l => l.id === id);
    if (deletedIndex !== -1) {
      const deletedLog = logs[deletedIndex];
      setRecentlyDeletedLog({ log: deletedLog, index: deletedIndex });
      setShowUndoToast(true);
      
      setLogs(prev => prev.filter(l => l.id !== id));
      setSelectedLogIds(prev => prev.filter(selectedId => selectedId !== id));
      
      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setShowUndoToast(false);
      }, 5000);
    }
  };

  const handleUndoDelete = () => {
    if (recentlyDeletedLog) {
      const { log, index } = recentlyDeletedLog;
      setLogs(prev => {
        const updated = [...prev];
        updated.splice(index, 0, log);
        return updated;
      });
      setSelectedLogIds(prev => [...prev, log.id]);
      setRecentlyDeletedLog(null);
      setShowUndoToast(false);
    }
  };

  const handleDownloadCSV = () => {
    const headers = ['Record ID', 'Species Name', 'Scientific Name', 'Trunk DBH (cm)', 'Canopy Diameter (m)', 'Canopy Area (m2)', 'CO2e Sequestered (kg)', 'PM2.5 Intercepted (mg/hr)', 'Stormwater Storage (L)'];
    const rows = logs.map(log => [
      log.id,
      `"${log.speciesName}"`,
      `"${log.scientificName}"`,
      log.dbh.toFixed(1),
      log.canopyDiameter.toFixed(1),
      log.canopyArea.toFixed(2),
      log.co2e.toFixed(2),
      log.pm25.toFixed(2),
      log.stormwater.toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ecoarbor_field_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    
    // Header Style
    doc.setFillColor(2, 48, 32); 
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ECOARBOR STUDIO', 15, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('PRECISION ECOLOGICAL MODELING & IMPACT ASSESSMENT REPORT', 15, 26);
    doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 15, 33);
    
    // Sub-header Info Block
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('FIELD ASSESSMENT METADATA', 15, 52);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Active Survey Location: ${liveLocationName || 'Dehradun, India (FRI HQ)'}`, 15, 58);
    doc.text(`Coordinates: ${liveLocation ? `${liveLocation.lat.toFixed(4)}°N, ${liveLocation.lon.toFixed(4)}°E` : 'Auto-localized GPS'}`, 15, 64);
    doc.text(`Ambient Air Quality (PM2.5): ${weatherData?.pm25.toFixed(1) || '42.0'} ug/m3  |  Ambient Wind Speed: ${weatherData?.windSpeed.toFixed(1) || '2.8'} m/s`, 15, 70);
    
    // Stand Aggregate Summary Box
    doc.setFillColor(240, 248, 240);
    doc.rect(15, 76, 180, 26, 'F');
    doc.setDrawColor(200, 225, 200);
    doc.rect(15, 76, 180, 26, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 80, 45);
    doc.text('AGGREGATE ARBOR STAND CALCULATIONS', 20, 82);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Trees Logged: ${standTotals.count}`, 20, 89);
    doc.text(`Total CO2e Sequestered: ${standTotals.co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`, 20, 95);
    doc.text(`Total PM2.5 Captured: ${standTotals.pm25.toLocaleString(undefined, { maximumFractionDigits: 1 })} mg/hr`, 110, 89);
    doc.text(`Stormwater Retention: ${standTotals.stormwater.toLocaleString(undefined, { maximumFractionDigits: 1 })} Liters`, 110, 95);

    // List of Logged Assets
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text('SURVEYED INVENTORY ASSETS', 15, 114);
    
    // Draw table headers
    let startY = 120;
    doc.setFillColor(220, 230, 220);
    doc.rect(15, startY, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(40, 60, 40);
    
    doc.text('ID', 17, startY + 5.5);
    doc.text('SPECIES (SCIENTIFIC NAME)', 35, startY + 5.5);
    doc.text('DBH', 105, startY + 5.5);
    doc.text('CANOPY', 120, startY + 5.5);
    doc.text('CO2e', 140, startY + 5.5);
    doc.text('PM2.5', 160, startY + 5.5);
    doc.text('STORMWATER', 180, startY + 5.5);
    
    // Draw table rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    
    logs.forEach((log, idx) => {
      const rowY = startY + 8 + (idx * 7.5);
      
      // Zebra striping
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 248);
        doc.rect(15, rowY, 180, 7.5, 'F');
      }
      
      doc.text(log.id, 17, rowY + 5);
      
      const fullName = `${log.speciesName} (${log.scientificName})`;
      const displayName = fullName.length > 34 ? fullName.substring(0, 32) + '...' : fullName;
      doc.text(displayName, 35, rowY + 5);
      
      doc.text(`${log.dbh.toFixed(0)}cm`, 105, rowY + 5);
      doc.text(`${log.canopyDiameter.toFixed(1)}m`, 120, rowY + 5);
      doc.text(`${log.co2e.toFixed(1)}kg`, 140, rowY + 5);
      doc.text(`${log.pm25.toFixed(0)}mg`, 160, rowY + 5);
      doc.text(`${log.stormwater.toFixed(1)}L`, 180, rowY + 5);
    });
    
    // Page footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('EcoArbor Studio - Urban Forestry Carbon & Hydrological Impact Report', 15, 287);
      doc.text(`Page ${i} of ${pageCount}`, 180, 287);
    }
    
    doc.save(`ecoarbor_ecological_impact_report_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020804] to-[#061408] text-slate-100 font-sans antialiased pb-24 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      {/* Fluid Mesh Gradient Background Glowing Orbs */}
      <div className="absolute top-[10%] left-[15%] w-[450px] h-[450px] rounded-full bg-[#1e3f20] filter blur-[120px] opacity-30 pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-[40%] right-[10%] w-[550px] h-[550px] rounded-full bg-[#16f686] filter blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute top-[70%] left-[25%] w-[500px] h-[500px] rounded-full bg-[#5beefc] filter blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[5%] right-[20%] w-[480px] h-[480px] rounded-full bg-[#1e3f20] filter blur-[120px] opacity-25 pointer-events-none" />

      {/* Top Banner & Title Header */}
      <header className="border-b border-white/10 bg-white/[0.02] backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-950/80 p-2 rounded-xl border border-emerald-500/30">
              <TreeDeciduous className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                EcoArbor Studio
                <span className="text-xs font-mono font-normal text-emerald-400/80 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/20">
                  v2.4 Pro
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Precision Ecological Modeling & Canopy Benefit Quantifier</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-300 font-mono font-medium tracking-wide">
              Methods: USDA, i-Tree, & FRI Compliant
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">

        {/* Real-time Location & Telemetry Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Tile 1: Live Location & Coordinates */}
          <div className="lg:col-span-4 bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-white/20 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Live Coordinates
                </span>
                <button
                  onClick={handleManualSync}
                  disabled={loadingLive}
                  className="p-1.5 rounded-lg bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer text-white/60 hover:text-white disabled:opacity-50"
                  title="Re-sync telemetry"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-950/80 text-emerald-400 rounded-xl border border-emerald-500/10 shadow-inner">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs text-white/50 font-medium">Current Location</h3>
                    <p className="text-sm font-semibold text-white/90 truncate max-w-[200px]">
                      {loadingLive ? 'Acquiring GPS...' : liveLocationName || 'Coordinates Synced'}
                    </p>
                  </div>
                </div>

                {liveLocation ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 font-mono">
                      <span className="text-[10px] text-white/40 block mb-0.5">LATITUDE</span>
                      <span className="text-xs font-bold text-white/90">{liveLocation.lat.toFixed(5)}°</span>
                    </div>
                    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 font-mono">
                      <span className="text-[10px] text-white/40 block mb-0.5">LONGITUDE</span>
                      <span className="text-xs font-bold text-white/90">{liveLocation.lon.toFixed(5)}°</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/[0.01] rounded-xl p-4 border border-dashed border-white/10 text-center py-6">
                    {liveError ? (
                      <div className="text-rose-400 text-xs flex flex-col items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="leading-tight px-2">{liveError}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-white/40">Requesting device location...</span>
                    )}
                  </div>
                )}

                {/* Manual Precision Search Bar */}
                <form onSubmit={handleSearchLocation} className="mt-4 pt-1 flex gap-1.5 border-t border-white/5">
                  <input
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder="Search city/area..."
                    className="flex-1 min-w-0 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all font-sans"
                  />
                  <button
                    type="submit"
                    disabled={loadingLive || !locationSearchQuery.trim()}
                    className="px-3 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-xl transition-all cursor-pointer font-medium hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:scale-100 flex items-center justify-center"
                  >
                    Search
                  </button>
                </form>
              </div>
            </div>

            {liveLocation && (
              <div className="text-[9px] font-mono text-emerald-400/80 bg-emerald-950/30 border border-emerald-500/10 rounded-lg p-2 mt-4 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Live location synchronized successfully.
              </div>
            )}
          </div>

          {/* Tile 2: Live Weather & Air Quality Telemetry */}
          <div className="lg:col-span-8 bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-white/20 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-500/20 flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5" />
                  Atmospheric & Air Quality Telemetry
                </span>
                <div className="flex items-center gap-2">
                  {isSynced && (
                    <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950 border border-emerald-500/20 px-2 py-0.5 rounded">
                      ✓ CAD Models Synced
                    </span>
                  )}
                  <button
                    onClick={handleManualSync}
                    disabled={loadingLive}
                    className="p-1.5 rounded-lg bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer text-white/60 hover:text-white disabled:opacity-50"
                    title="Re-sync telemetry"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingLive && !weatherData ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
                  <p className="text-xs text-white/50">Fetching atmospheric metrics from Open-Meteo API...</p>
                </div>
              ) : weatherData ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  
                  {/* Temp */}
                  <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center justify-between text-orange-400">
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Temp</span>
                      <Thermometer className="w-3.5 h-3.5" />
                    </div>
                    <div className="mt-2">
                      <div className="text-base font-bold text-white font-mono">{weatherData.temp}°C</div>
                      <span className="text-[9px] text-white/30">Ambient</span>
                    </div>
                  </div>

                  {/* Wind Speed */}
                  <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center justify-between text-teal-400">
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Wind</span>
                      <Wind className="w-3.5 h-3.5" />
                    </div>
                    <div className="mt-2">
                      <div className="text-base font-bold text-white font-mono">{weatherData.windSpeed} <span className="text-[10px] font-normal text-white/40">m/s</span></div>
                      <span className="text-[9px] text-white/30">Velocity</span>
                    </div>
                  </div>

                  {/* Wind Direction */}
                  <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center justify-between text-sky-400">
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Heading</span>
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <div className="mt-2">
                      <div className="text-base font-bold text-white font-mono">{weatherData.windDir}° <span className="text-xs text-sky-400 font-semibold">{getCompassDirection(weatherData.windDir)}</span></div>
                      <span className="text-[9px] text-white/30">Direction</span>
                    </div>
                  </div>

                  {/* PM2.5 */}
                  <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center justify-between text-rose-400">
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">PM2.5</span>
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="mt-2">
                      <div className={`text-base font-bold font-mono ${
                        weatherData.pm25 < 12 ? 'text-emerald-400' : weatherData.pm25 < 35 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {weatherData.pm25.toFixed(1)}
                      </div>
                      <span className="text-[9px] text-white/30">µg/m³</span>
                    </div>
                  </div>

                  {/* Carbon Monoxide */}
                  <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center justify-between text-blue-400">
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">CO</span>
                      <Droplets className="w-3.5 h-3.5" />
                    </div>
                    <div className="mt-2">
                      <div className="text-base font-bold text-white font-mono">{weatherData.co.toFixed(0)}</div>
                      <span className="text-[9px] text-white/30">µg/m³</span>
                    </div>
                  </div>

                  {/* Ozone */}
                  <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center justify-between text-indigo-400">
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Ozone</span>
                      <Leaf className="w-3.5 h-3.5" />
                    </div>
                    <div className="mt-2">
                      <div className="text-base font-bold text-white font-mono">{weatherData.ozone.toFixed(1)}</div>
                      <span className="text-[9px] text-white/30">µg/m³</span>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="py-10 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                  <p className="text-xs text-white/40">Please allow location services or click &quot;Re-sync&quot; to pull localized atmospheric details.</p>
                </div>
              )}
            </div>

            {weatherData && (
              <p className="text-[10px] text-white/40 mt-4 leading-normal flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-white/40 inline" />
                <span>The aerodynamic PM2.5 capture calculation of the simulated tree canopy actively updates based on the live wind speed of <strong className="text-white/80">{weatherData.windSpeed} m/s</strong> and localized concentration of <strong className="text-white/80">{weatherData.pm25} µg/m³</strong>.</span>
              </p>
            )}
          </div>

        </div>

        {/* Ecological Overview Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/20 p-4">
          <div className="flex items-center gap-3 p-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xs text-white/60">Selected Species</div>
              <div className="text-sm font-semibold text-white/90">{activeSpecies.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 border-t md:border-t-0 md:border-l border-white/10">
            <Layers className="w-5 h-5 text-sky-400" />
            <div>
              <div className="text-xs text-white/60">Canopy Surface Area</div>
              <div className="text-sm font-semibold text-sky-400 font-mono">{metrics.canopyArea.toFixed(1)} m²</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 border-t md:border-t-0 md:border-l border-white/10">
            <Droplets className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-xs text-white/60">Leaf Area Index (LAI)</div>
              <div className="text-sm font-semibold text-blue-400 font-mono">{activeSpecies.lai.toFixed(1)} m²/m²</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 border-t md:border-t-0 md:border-l border-white/10">
            <Wind className="w-5 h-5 text-teal-400" />
            <div>
              <div className="text-xs text-white/60">Dry Wood Biomass</div>
              <div className="text-sm font-semibold text-emerald-400 font-mono">{metrics.biomass.toFixed(1)} kg</div>
            </div>
          </div>
        </div>

        {/* Primary Simulation Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Inputs and Parameter Sliders */}
          <section id="parameter-panel" className="lg:col-span-4 space-y-6">
            <div className="bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/20 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <h2 className="text-md font-bold text-white/90 mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
                <Activity className="w-4 h-4 text-emerald-400" />
                Arboricultural Inputs
              </h2>

              <div className="space-y-6">
                
                {/* Seasonal State Selector */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between shadow-inner">
                  <div>
                    <span className="text-xs font-semibold text-white/80 block">Seasonal Engine</span>
                    <span className="text-[10px] text-white/40 mt-0.5 block">Simulates leaf loss metrics</span>
                  </div>
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-white/10 gap-1">
                    <button
                      type="button"
                      onClick={() => setSeasonalMode('summer')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        seasonalMode === 'summer'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-white/40 hover:text-white/80 border border-transparent'
                      }`}
                    >
                      <CloudSun className="w-3.5 h-3.5" />
                      Summer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeasonalMode('winter')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        seasonalMode === 'winter'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'text-white/40 hover:text-white/80 border border-transparent'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Winter
                    </button>
                  </div>
                </div>

                {/* Custom Species Dropdown */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Tree Species Inventory</label>
                    <span className="text-xs font-mono text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">{activeSpecies.type}</span>
                  </div>
                  
                  {/* Selector Button */}
                  <button
                    type="button"
                    onClick={() => setIsSpeciesDropdownOpen(!isSpeciesDropdownOpen)}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm font-medium text-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all flex items-center justify-between cursor-pointer shadow-md text-left"
                  >
                    <div>
                      <div className="font-semibold text-white">{activeSpecies.name}</div>
                      <div className="text-[10px] text-white/40 italic">{activeSpecies.scientificName}</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-200 ${isSpeciesDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Popover */}
                  <AnimatePresence>
                    {isSpeciesDropdownOpen && (
                      <>
                        {/* Backdrop to close on outer click */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsSpeciesDropdownOpen(false)} 
                        />
                        
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 z-50 mt-2 bg-slate-950/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-3 overflow-hidden flex flex-col max-h-[350px]"
                        >
                          {/* Search Input */}
                           <div className="relative mb-2.5">
                            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/40" />
                            <input
                              type="text"
                              placeholder="Search common, scientific, family..."
                              value={speciesSearchQuery}
                              onChange={(e) => setSpeciesSearchQuery(e.target.value)}
                              className="w-full bg-white/[0.05] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all font-sans"
                            />
                          </div>

                          {/* Filter Tabs */}
                          <div className="flex gap-1 bg-white/[0.02] p-0.5 rounded-lg border border-white/5 mb-2.5">
                            {(['All', 'Conifer', 'Broadleaf'] as const).map(tab => (
                              <button
                                key={tab}
                                type="button"
                                onClick={() => setSpeciesTypeFilter(tab)}
                                className={`flex-1 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                                  speciesTypeFilter === tab
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                    : 'text-white/40 hover:text-white/80 border border-transparent'
                                }`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          {/* Species Options List */}
                          <div className="overflow-y-auto space-y-1 pr-1 flex-1">
                            {speciesData
                              .filter(s => {
                                if (speciesTypeFilter !== 'All' && s.type !== speciesTypeFilter) return false;
                                const query = speciesSearchQuery.toLowerCase();
                                return (
                                  s.name.toLowerCase().includes(query) ||
                                  s.scientificName.toLowerCase().includes(query) ||
                                  s.family.toLowerCase().includes(query)
                                );
                              })
                              .map(s => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSpeciesId(s.id);
                                    setIsSpeciesDropdownOpen(false);
                                    setSpeciesSearchQuery('');
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between border ${
                                    selectedSpeciesId === s.id
                                      ? 'bg-emerald-500/10 border-emerald-500/20'
                                      : 'bg-transparent border-transparent hover:bg-white/[0.04]'
                                  }`}
                                >
                                  <div>
                                    <div className="text-xs font-semibold text-white/95">{s.name}</div>
                                    <div className="text-[10px] text-white/40 italic mt-0.5">{s.scientificName}</div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-[9px] font-mono text-white/40 font-semibold uppercase tracking-wider">{s.family}</span>
                                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                                      s.type === 'Conifer' 
                                        ? 'bg-teal-950/60 text-teal-400 border border-teal-500/20' 
                                        : 'bg-amber-950/60 text-amber-400 border border-amber-500/20'
                                    }`}>
                                      {s.type}
                                    </span>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Trunk DBH */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Trunk DBH</label>
                    <span className="text-xs font-mono font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/30">
                      {dbh.toFixed(1)} cm
                    </span>
                  </div>
                  <input 
                    type="range" min="10" max="150" step="0.5" 
                    value={dbh} onChange={(e) => setDbh(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-colors" 
                  />
                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>10 cm (Sapling)</span>
                    <span>150 cm (Giant)</span>
                  </div>
                </div>

                {/* Canopy Diameter */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Canopy Diameter</label>
                    <span className="text-xs font-mono font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/30">
                      {canopyDiameter.toFixed(1)} m
                    </span>
                  </div>
                  <input 
                    type="range" min="2" max="25" step="0.5" 
                    value={canopyDiameter} onChange={(e) => setCanopyDiameter(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-colors" 
                  />
                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>2 m</span>
                    <span>25 m</span>
                  </div>
                </div>

                {/* Ambient PM2.5 */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Ambient PM2.5</label>
                    <span className="text-xs font-mono font-semibold text-sky-300 bg-sky-950/80 px-2 py-1 rounded border border-sky-500/30">
                      {pm25} µg/m³
                    </span>
                  </div>
                  <input 
                    type="range" min="5" max="300" step="1" 
                    value={pm25} onChange={(e) => setPm25(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-colors" 
                  />
                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>5 µg/m³ (Clean)</span>
                    <span className="text-red-400 font-medium">300 µg/m³ (Severe AQI)</span>
                  </div>
                </div>

                {/* Wind Speed */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Ambient Wind Speed</label>
                    <span className="text-xs font-mono font-semibold text-blue-300 bg-blue-950/80 px-2 py-1 rounded border border-blue-500/30">
                      {windSpeed.toFixed(1)} m/s
                    </span>
                  </div>
                  <input 
                    type="range" min="1" max="12" step="0.5" 
                    value={windSpeed} onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-colors" 
                  />
                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>1 m/s (Breeze)</span>
                    <span>12 m/s (Gale)</span>
                  </div>
                </div>

                {/* Log Tree Asset Button inside Arboricultural Inputs */}
                <div className="pt-5 border-t border-white/10">
                  <button
                    onClick={handleLogTree}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-white/10 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-emerald-900/30 active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    Log Tree Asset to Field Report
                  </button>
                </div>

              </div>
            </div>
          </section>

          {/* Right Panel: Metrics Dashboard & Scientific Visualizer */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Real-time Dynamic CAD/GIS Sandbox */}
            <div className="bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/20 p-6 overflow-hidden relative">
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/[0.02] backdrop-blur border border-white/10 px-2.5 py-1 rounded-md text-[10px] font-mono text-white/60">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Live Canopy CAD Simulator
              </div>
              
              <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">
                Interactive Morphology Preview
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* SVG Live Vector Render */}
                <div className="lg:col-span-7 bg-slate-950/40 backdrop-blur-sm rounded-xl p-4 border border-white/10 aspect-[16/10] relative flex items-center justify-center overflow-hidden">
                  
                  {/* Rain background effect based on stormwater storage */}
                  <div className="absolute inset-0 pointer-events-none opacity-20">
                    <svg className="w-full h-full">
                      <pattern id="rain" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
                        <line x1="20" y1="0" x2="20" y2="20" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 4" />
                        <line x1="40" y1="20" x2="40" y2="40" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 4" />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#rain)" />
                    </svg>
                  </div>

                  {/* Wind dust particles based on windSpeed and PM2.5 */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(Math.min(25, Math.ceil(pm25 / 10)))].map((_, i) => {
                      const speed = 15 / windSpeed; // faster speed for higher wind
                      const top = (i * 17) % 100;
                      return (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-sky-300/40 rounded-full"
                          initial={{ x: -10 }}
                          animate={{ x: '110%' }}
                          transition={{
                            duration: speed,
                            repeat: Infinity,
                            delay: (i * 0.3) % 4,
                            ease: 'linear'
                          }}
                          style={{ top: `${top}%` }}
                        />
                      );
                    })}
                  </div>

                  {/* Interactive Tree Render */}
                  <svg viewBox="0 0 400 250" className="w-full h-full max-h-[220px]">
                    <defs>
                      <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2e1f18" />
                        <stop offset="50%" stopColor="#4a3525" />
                        <stop offset="100%" stopColor="#2e1f18" />
                      </linearGradient>
                      <radialGradient id="canopyGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={
                          (seasonalMode === 'winter' && activeSpecies.type === 'Broadleaf') 
                            ? '#7c5a45' 
                            : activeSpecies.foliageColor
                        } />
                        <stop offset="75%" stopColor={
                          (seasonalMode === 'winter' && activeSpecies.type === 'Broadleaf') 
                            ? '#5a4132' 
                            : activeSpecies.foliageColor
                        } />
                        <stop offset="100%" stopColor={
                          (seasonalMode === 'winter' && activeSpecies.type === 'Broadleaf') 
                            ? '#3d2b21' 
                            : '#082f1b'
                        } />
                      </radialGradient>
                    </defs>

                    {/* Ground line */}
                    <line x1="20" y1="210" x2="380" y2="210" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
                    
                    {/* Trunk rendering scaled with DBH */}
                    <rect 
                       x={200 - (dbh * 0.12)} 
                       y={210 - 75} 
                       width={Math.max(4, dbh * 0.24)} 
                       height="75" 
                       fill="url(#trunkGrad)"
                       rx="2"
                    />

                    {/* Branch arms for wider canopy diameters */}
                    {canopyDiameter > 10 && (
                      <>
                        <path d={`M 200,165 Q ${200 - canopyDiameter * 4},160 ${200 - canopyDiameter * 6},150`} stroke="#3d2a1f" strokeWidth={Math.max(2, dbh * 0.08)} fill="none" />
                        <path d={`M 200,165 Q ${200 + canopyDiameter * 4},160 ${200 + canopyDiameter * 6},150`} stroke="#3d2a1f" strokeWidth={Math.max(2, dbh * 0.08)} fill="none" />
                      </>
                    )}

                    {/* Foliage rendering based on active species */}
                    {activeSpecies.type === 'Conifer' ? (
                      // Conical coniferous geometry
                      <polygon 
                        points={`
                          200,${155 - (canopyDiameter * 4)} 
                          ${200 - (canopyDiameter * 6.5)},175 
                          ${200 + (canopyDiameter * 6.5)},175
                        `}
                        fill="url(#canopyGrad)"
                        opacity="0.9"
                        stroke="#0f3d23"
                        strokeWidth="1.5"
                      />
                    ) : (
                      // Broadleaf rounded canopy - in winter, it becomes bare branch outlines and sparse dry leaves
                      <>
                        {seasonalMode === 'winter' && (
                          <>
                            {/* Bare branch lines inside winter canopy */}
                            <path d={`M 200,165 Q ${200 - canopyDiameter * 3},150 ${200 - canopyDiameter * 4.5},125`} stroke="#4a3525" strokeWidth="2" fill="none" />
                            <path d={`M 200,165 Q ${200 + canopyDiameter * 3},150 ${200 + canopyDiameter * 4.5},125`} stroke="#4a3525" strokeWidth="2" fill="none" />
                            <path d={`M 200,145 Q ${200 - canopyDiameter * 1.5},125 ${200 - canopyDiameter * 2.5},105`} stroke="#4a3525" strokeWidth="1.8" fill="none" />
                            <path d={`M 200,145 Q ${200 + canopyDiameter * 1.5},125 ${200 + canopyDiameter * 2.5},105`} stroke="#4a3525" strokeWidth="1.8" fill="none" />
                            <path d={`M 200,125 Q 200,105 200,90`} stroke="#4a3525" strokeWidth="1.5" fill="none" />
                          </>
                        )}
                        <ellipse 
                          cx="200" 
                          cy="130" 
                          rx={canopyDiameter * 6.5} 
                          ry={Math.max(30, canopyDiameter * 4.5)} 
                          fill="url(#canopyGrad)" 
                          opacity={seasonalMode === 'winter' ? '0.18' : '0.9'}
                          stroke={seasonalMode === 'winter' ? '#5a4132' : '#0f3d23'}
                          strokeWidth="1.5"
                        />
                      </>
                    )}

                    {/* Additional botanical detail patterns to match canopy density (LAI) */}
                    {[...Array(Math.max(1, Math.min(12, Math.floor(metrics.activeLai * 1.5))))].map((_, index) => {
                      const spreadX = (canopyDiameter * 4.5);
                      const rx = 200 + (Math.sin(index * 2.3) * spreadX * 0.8);
                      const ry = activeSpecies.type === 'Conifer' 
                        ? 140 + (index * 2.5) 
                        : 130 + (Math.cos(index * 1.7) * (canopyDiameter * 3) * 0.6);
                      
                      return (
                        <circle 
                          key={index} 
                          cx={rx} 
                          cy={ry} 
                          r={activeSpecies.type === 'Conifer' ? 6 : 9} 
                          fill={seasonalMode === 'winter' ? '#7c5a45' : '#10b981'} 
                          opacity={seasonalMode === 'winter' ? '0.2' : '0.3'} 
                        />
                      );
                    })}

                    {/* Dimensions arrows and annotation layers */}
                    {/* DBH marker */}
                    <line x1={190 - (dbh * 0.12)} y1="225" x2={210 + (dbh * 0.12)} y2="225" stroke="#10b981" strokeWidth="1" />
                    <circle cx={190 - (dbh * 0.12)} cy="225" r="2" fill="#10b981" />
                    <circle cx={210 + (dbh * 0.12)} cy="225" r="2" fill="#10b981" />
                    <text x="200" y="237" fill="#10b981" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      DBH: {dbh.toFixed(1)}cm
                    </text>

                    {/* Canopy Diameter marker */}
                    <line x1={200 - (canopyDiameter * 6.5)} y1="75" x2={200 + (canopyDiameter * 6.5)} y2="75" stroke="#3b82f6" strokeWidth="1" />
                    <circle cx={200 - (canopyDiameter * 6.5)} cy="75" r="2" fill="#3b82f6" />
                    <circle cx={200 + (canopyDiameter * 6.5)} cy="75" r="2" fill="#3b82f6" />
                    <text x="200" y="65" fill="#3b82f6" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      Canopy: {canopyDiameter.toFixed(1)}m
                    </text>
                  </svg>
                </div>

                {/* Botanical Species dossier / facts */}
                <div className="lg:col-span-5 space-y-4">
                  <div>
                    <h3 className="text-md font-bold text-white/90 leading-tight">
                      {activeSpecies.name}
                    </h3>
                    <p className="text-xs italic text-emerald-400 font-serif">
                      {activeSpecies.scientificName}
                    </p>
                  </div>

                  <div className="text-xs space-y-2 text-white/70">
                    <div>
                      <span className="font-semibold text-white/40 block uppercase text-[9px] tracking-wider">Botanical Family</span>
                      <p className="font-mono bg-white/[0.04] backdrop-blur-md px-2 py-1 rounded text-white/90 mt-0.5 border border-white/10 inline-block">{activeSpecies.family}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-white/40 block uppercase text-[9px] tracking-wider">Ecological Niche</span>
                      <p className="text-white/80">{activeSpecies.habitat}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-white/40 block uppercase text-[9px] tracking-wider">Species Profile</span>
                      <p className="leading-relaxed text-white/60">{activeSpecies.description}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Metrics Dashboard Output Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Carbon */}
              <div 
                className={`bg-white/[0.04] backdrop-blur-lg border rounded-2xl shadow-2xl transition-all duration-300 cursor-pointer p-6 flex flex-col justify-between group ${
                  inspectingMetric === 'carbon' ? 'border-emerald-400 ring-1 ring-emerald-400/20 bg-white/[0.08]' : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => setInspectingMetric(inspectingMetric === 'carbon' ? null : 'carbon')}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-emerald-950/80 rounded-xl border border-emerald-500/20 text-emerald-400">
                      <Leaf className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-medium text-emerald-400/80 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/20">
                      CO₂e Active
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white/90 mt-4">Carbon Sequestration</h3>
                  <div className="mt-3 flex items-baseline gap-1.5 h-10 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={selectedSpeciesId + '-' + dbh}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="text-3xl font-bold tracking-tight text-white font-mono"
                      >
                        {metrics.co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm text-white/60 font-medium self-end ml-1">kg</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 text-[10px] text-white/40 flex items-center justify-between">
                  <span>Click to view equations</span>
                  <Info className="w-3.5 h-3.5 text-white/40 group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>

              {/* Card 2: Air Quality */}
              <div 
                className={`bg-white/[0.04] backdrop-blur-lg border rounded-2xl shadow-2xl transition-all duration-300 cursor-pointer p-6 flex flex-col justify-between group ${
                  inspectingMetric === 'air' ? 'border-sky-400 ring-1 ring-sky-400/20 bg-white/[0.08]' : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => setInspectingMetric(inspectingMetric === 'air' ? null : 'air')}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-sky-950/80 rounded-xl border border-sky-500/20 text-sky-400">
                      <Wind className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-medium text-sky-400/80 bg-sky-950 px-2 py-0.5 rounded border border-sky-500/20">
                      PM₂.₅ Deposition
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white/90 mt-4">Air Quality Benefit</h3>
                  <div className="mt-3 flex items-baseline gap-1.5 h-10 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={selectedSpeciesId + '-' + pm25 + '-' + windSpeed + '-' + canopyDiameter}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="text-3xl font-bold tracking-tight text-white font-mono"
                      >
                        {metrics.pm25Intercepted.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm text-white/60 font-medium self-end ml-1">mg/hr</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 text-[10px] text-white/40 flex items-center justify-between">
                  <span>Click to view equations</span>
                  <Info className="w-3.5 h-3.5 text-white/40 group-hover:text-sky-400 transition-colors" />
                </div>
              </div>

              {/* Card 3: Hydrology */}
              <div 
                className={`bg-white/[0.04] backdrop-blur-lg border rounded-2xl shadow-2xl transition-all duration-300 cursor-pointer p-6 flex flex-col justify-between group ${
                  inspectingMetric === 'hydrology' ? 'border-blue-400 ring-1 ring-blue-400/20 bg-white/[0.08]' : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => setInspectingMetric(inspectingMetric === 'hydrology' ? null : 'hydrology')}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-blue-950/80 rounded-xl border border-blue-500/20 text-blue-400">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-medium text-blue-400/80 bg-blue-950 px-2 py-0.5 rounded border border-blue-500/20">
                      Stormwater Sc
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white/90 mt-4">Hydrological Retention</h3>
                  <div className="mt-3 flex items-baseline gap-1.5 h-10 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={selectedSpeciesId + '-' + canopyDiameter}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="text-3xl font-bold tracking-tight text-white font-mono"
                      >
                        {metrics.stormwater.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm text-white/60 font-medium self-end ml-1">Liters</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 text-[10px] text-white/40 flex items-center justify-between">
                  <span>Click to view equations</span>
                  <Info className="w-3.5 h-3.5 text-white/40 group-hover:text-blue-400 transition-colors" />
                </div>
              </div>

            </div>

            {/* Interactive Math & Equation Inspector Drawer */}
            <AnimatePresence mode="wait">
              {inspectingMetric && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white/[0.02] backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden"
                >
                  {inspectingMetric === 'carbon' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          Step-by-Step Carbon Equation Walkthrough
                        </h4>
                        <button onClick={() => setInspectingMetric(null)} className="text-xs text-white/40 hover:text-white/80 cursor-pointer">Close</button>
                      </div>
                      <div className="text-xs text-white/70 space-y-3 font-mono leading-relaxed">
                        <div>
                          <span className="text-white/40 block">Step 1: Calculate Aboveground Dry Wood Biomass (M)</span>
                          <span className="text-white/60">Formula:</span> {activeSpecies.equationType === 'power' ? 'M = a * (DBH ^ b)' : 'M = exp(a + b * ln(DBH))'}<br/>
                          <span className="text-white/60">Substitution:</span> M = {
                            activeSpecies.equationType === 'power' 
                              ? `${activeSpecies.a} * (${dbh.toFixed(1)} ^ ${activeSpecies.b})`
                              : `exp(${activeSpecies.a} + ${activeSpecies.b} * ln(${dbh.toFixed(1)}))`
                          }<br/>
                          <span className="text-emerald-400 font-semibold">Output:</span> M = <span className="text-white">{metrics.biomass.toFixed(4)} kg</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Step 2: Dry wood Carbon fraction (assume 50% Carbon Content)</span>
                          <span className="text-white/60">Formula:</span> Carbon Content = M * 0.50<br/>
                          <span className="text-white/60">Substitution:</span> Carbon = {metrics.biomass.toFixed(4)} * 0.50<br/>
                          <span className="text-emerald-400 font-semibold">Output:</span> Carbon Content = <span className="text-white">{metrics.carbonContent.toFixed(4)} kg C</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Step 3: Convert to Carbon Dioxide Equivalent (CO₂e)</span>
                          <span className="text-white/60">Formula:</span> CO₂e = Carbon Content * (Molecular weight CO₂ / Carbon) ≈ Carbon Content * 3.667<br/>
                          <span className="text-white/60">Substitution:</span> CO₂e = {metrics.carbonContent.toFixed(4)} * (44.01 / 12.011)<br/>
                          <span className="text-emerald-400 font-bold">Calculated CO₂e:</span> <span className="text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/20">{metrics.co2e.toFixed(2)} kg</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {inspectingMetric === 'air' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          i-Tree PM2.5 Deposition Mathematical Disclosures
                        </h4>
                        <button onClick={() => setInspectingMetric(null)} className="text-xs text-white/40 hover:text-white/80 cursor-pointer">Close</button>
                      </div>
                      <div className="text-xs text-white/70 space-y-3 font-mono leading-relaxed">
                        <div>
                          <span className="text-white/40 block">Step 1: Determine Canopy Ground Area (A)</span>
                          <span className="text-white/60">Formula:</span> A = π * (Canopy_Diameter / 2)²<br/>
                          <span className="text-white/60">Substitution:</span> A = 3.14159 * ({canopyDiameter.toFixed(1)} / 2)²<br/>
                          <span className="text-sky-400 font-semibold">Output:</span> A = <span className="text-white">{metrics.canopyArea.toFixed(4)} m²</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Step 2: Compute Wind-Adjusted Deposition Velocity (Vd)</span>
                          <span className="text-white/60">Formula:</span> {activeSpecies.type === 'Conifer' ? 'Vd = Base_Vd + (0.0005 * Wind)' : 'Vd = Base_Vd + (0.0002 * Wind)'} m/s<br/>
                          <span className="text-white/60">Substitution:</span> Vd = {activeSpecies.baseVd} + ({activeSpecies.type === 'Conifer' ? '0.0005' : '0.0002'} * {windSpeed.toFixed(1)})<br/>
                          <span className="text-sky-400 font-semibold">Output (m/s):</span> Vd = <span className="text-white">{metrics.vdMPS.toFixed(6)} m/s</span><br/>
                          <span className="text-white/60">Convert to m/hr:</span> Vd = {metrics.vdMPS.toFixed(6)} * 3600 = <span className="text-white">{metrics.vdPerHour.toFixed(4)} m/hr</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Step 3: Convert Ambient PM2.5 Concentration to g/m³</span>
                          <span className="text-white/60">Formula:</span> C = Ambient * 1e-6<br/>
                          <span className="text-white/60">Substitution:</span> C = {pm25} * 0.000001 = <span className="text-white">{(pm25 * 1e-6).toFixed(8)} g/m³</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Step 4: Compute Total Hourly Intercepted Mass (P)</span>
                          <span className="text-white/60">Formula:</span> P = Vd_hr * C * LAI * A * 1000 mg/hr<br/>
                          <span className="text-white/60">Substitution:</span> P = {metrics.vdPerHour.toFixed(4)} * {(pm25 * 1e-6).toFixed(8)} * {activeSpecies.lai} * {metrics.canopyArea.toFixed(4)} * 1000<br/>
                          <span className="text-sky-400 font-bold">Calculated Interception:</span> <span className="text-sky-300 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-500/20">{metrics.pm25Intercepted.toFixed(2)} mg/hour</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {inspectingMetric === 'hydrology' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          Ecohydrological Rain Retention Formula Disclosures
                        </h4>
                        <button onClick={() => setInspectingMetric(null)} className="text-xs text-white/40 hover:text-white/80 cursor-pointer">Close</button>
                      </div>
                      <div className="text-xs text-white/70 space-y-3 font-mono leading-relaxed">
                        <div>
                          <span className="text-white/40 block">Step 1: Determine Canopy Ground Area (A)</span>
                          <span className="text-white/60">Formula:</span> A = π * (Canopy_Diameter / 2)² = <span className="text-white">{metrics.canopyArea.toFixed(4)} m²</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Step 2: Apply Leaf Area Index (LAI) and Storage Capacity (Sc)</span>
                          <span className="text-white/60">Formula:</span> I = Sc * LAI * A<br/>
                          <span className="text-white/60">Parameters:</span> Sc (Canopy Capacity) = {activeSpecies.sc} mm | LAI = {activeSpecies.lai} m²/m²<br/>
                          <span className="text-white/40 block leading-relaxed">Note: Canopy capacity (mm) scales with leaf index, representing Liters of water held per square meter of leaf area before reaching the soil.</span>
                          <span className="text-white/60">Substitution:</span> I = {activeSpecies.sc} * {activeSpecies.lai} * {metrics.canopyArea.toFixed(4)}<br/>
                          <span className="text-blue-400 font-bold">Calculated Water Storage:</span> <span className="text-blue-300 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-500/20">{metrics.stormwater.toFixed(1)} Liters</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dynamic Predictive Growth Forecaster */}
            <div className="bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:border-white/20 relative overflow-hidden mt-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-950/80 rounded-xl border border-emerald-500/20 text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-md font-bold text-white/90">Botanical Growth & Ecological Projection Engine</h2>
                    <p className="text-xs text-white/40 mt-0.5">Calculates multi-decade carbon & air quality compounding benefits</p>
                  </div>
                </div>
                <div className="text-xs font-mono bg-white/[0.02] border border-white/15 px-3 py-1.5 rounded-lg text-white/60">
                  Estimated growth rate: <span className="text-emerald-400 font-bold">
                    {activeSpecies.family.includes('Moraceae') || activeSpecies.name.includes('Fig') ? '+1.2 cm/yr' : 
                     activeSpecies.name.includes('Cedar') || activeSpecies.name.includes('Pine') ? '+0.6 cm/yr' : '+0.95 cm/yr'}
                  </span> DBH
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {growthProjections.map((projection, i) => {
                  const carbonIncrease = metrics.co2e > 0 ? ((projection.co2e - metrics.co2e) / metrics.co2e * 100) : 0;
                  const pm25Increase = metrics.pm25Intercepted > 0 ? ((projection.pm25 - metrics.pm25Intercepted) / metrics.pm25Intercepted * 100) : 0;
                  const colors = [
                    { border: 'border-emerald-500/15', bg: 'bg-emerald-500/[0.02]', text: 'text-emerald-400', glow: 'from-emerald-500/5 to-transparent' },
                    { border: 'border-teal-500/15', bg: 'bg-teal-500/[0.02]', text: 'text-teal-400', glow: 'from-teal-500/5 to-transparent' },
                    { border: 'border-blue-500/15', bg: 'bg-blue-500/[0.02]', text: 'text-blue-400', glow: 'from-blue-500/5 to-transparent' }
                  ];
                  const scheme = colors[i];

                  return (
                    <motion.div
                      key={projection.year}
                      whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.2)' }}
                      className={`relative overflow-hidden rounded-xl border ${scheme.border} ${scheme.bg} p-5 flex flex-col justify-between shadow-xl transition-all duration-300`}
                    >
                      {/* Ambient background glow */}
                      <div className={`absolute -right-4 -top-4 w-16 h-16 bg-gradient-to-br ${scheme.glow} rounded-full blur-xl pointer-events-none`} />

                      <div>
                        {/* Year Badge */}
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-xs font-mono font-bold tracking-wider uppercase ${scheme.text}`}>
                            + {projection.year} Years Projection
                          </span>
                          <span className="text-[10px] font-mono text-white/30">Target Year {new Date().getFullYear() + projection.year}</span>
                        </div>

                        {/* Dimensions */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-white/5 mb-4 text-center">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-white/30 block">DBH</span>
                            <span className="text-xs font-mono font-bold text-white/95">{projection.dbh.toFixed(1)} cm</span>
                          </div>
                          <div className="border-l border-white/5">
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-white/30 block">Canopy</span>
                            <span className="text-xs font-mono font-bold text-white/95">{projection.canopyDiameter.toFixed(1)} m</span>
                          </div>
                        </div>

                        {/* Projected Benefits */}
                        <div className="space-y-3">
                          {/* Carbon Benefit */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-white/40">CO₂e Storage</span>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-white">{projection.co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</span>
                              <span className="text-[9px] font-mono font-bold text-emerald-400 ml-1.5">+{carbonIncrease.toFixed(0)}%</span>
                            </div>
                          </div>

                          {/* PM2.5 Benefit */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-white/40">PM₂.₅ Deposition</span>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-white">{projection.pm25.toLocaleString(undefined, { maximumFractionDigits: 1 })} mg/hr</span>
                              <span className="text-[9px] font-mono font-bold text-sky-400 ml-1.5">+{pm25Increase.toFixed(0)}%</span>
                            </div>
                          </div>

                          {/* Hydrological Retention */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-white/40">Rain Retention</span>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-white">{projection.stormwater.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</span>
                              <span className="text-[9px] font-mono font-bold text-blue-400 ml-1.5">+{((projection.stormwater - metrics.stormwater) / metrics.stormwater * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30">
                        <span>Compounding Sequestration</span>
                        <ChevronDown className="w-3 h-3 text-white/20 -rotate-90" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Arbor Stand Synthesis Summary (Aggregate Dashboard) */}
        {logs.length > 0 && (
          <div className="bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/20 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
              <div>
                <h2 className="text-md font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  Logged Arbor Stand Summary
                </h2>
                <p className="text-xs text-white/60 mt-1">Aggregated ecological impact of your customized forest stand</p>
              </div>
              <div className="flex items-center gap-2 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-white/80">
                <span>Active Population:</span>
                <span className="text-emerald-400 font-bold">{standTotals.count} trees</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/[0.02] backdrop-blur rounded-xl p-4 border border-white/10 flex items-center gap-4">
                <div className="p-2.5 bg-emerald-950/80 rounded-lg text-emerald-400 border border-emerald-500/10">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-white/40 tracking-wider">Total CO₂e Sequestered</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {standTotals.co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-white/40 font-normal">kg</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.02] backdrop-blur rounded-xl p-4 border border-white/10 flex items-center gap-4">
                <div className="p-2.5 bg-sky-950/80 rounded-lg text-sky-400 border border-sky-500/10">
                  <Wind className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-white/40 tracking-wider">Total PM2.5 Intercepted</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {standTotals.pm25.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-white/40 font-normal">mg/hr</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.02] backdrop-blur rounded-xl p-4 border border-white/10 flex items-center gap-4">
                <div className="p-2.5 bg-blue-950/80 rounded-lg text-blue-400 border border-blue-500/10">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-white/40 tracking-wider">Stormwater Storage Held</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {standTotals.stormwater.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-white/40 font-normal">Liters</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Field Log Table */}
        <div className="bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/20 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02]">
            <div>
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Arborist Field Report Log
              </h2>
              <p className="text-xs text-white/60 mt-1">Real-time database of surveyed tree inventory assets</p>
            </div>
            {logs.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 text-xs font-semibold text-sky-300 bg-sky-950/80 hover:bg-sky-900/80 px-4 py-2.5 rounded-lg transition-colors border border-sky-500/30 active:scale-95 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF Report
                </button>
                <button 
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/80 px-4 py-2.5 rounded-lg transition-colors border border-emerald-500/30 active:scale-95 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
                <button 
                  onClick={handleClearLogs}
                  className="flex items-center gap-2 text-xs font-semibold text-red-300 bg-red-950/40 hover:bg-red-950/60 px-4 py-2.5 rounded-lg transition-colors border border-red-500/20 active:scale-95 cursor-pointer shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Inventory
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {logs.length > 0 ? (
              <>
                {/* Desktop and Tablet Tabular Layout */}
                <table className="hidden md:table w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] text-white/60 font-semibold uppercase tracking-wider bg-white/[0.02]">
                      <th className="px-6 py-4 text-center w-16">
                        <div className="flex items-center justify-center gap-1.5">
                          <input 
                            type="checkbox"
                            className="rounded border-white/10 text-emerald-500 focus:ring-emerald-500/30 bg-slate-950 cursor-pointer w-3.5 h-3.5 accent-emerald-500"
                            checked={logs.length > 0 && selectedLogIds.length === logs.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLogIds(logs.map(log => log.id));
                              } else {
                                setSelectedLogIds([]);
                              }
                            }}
                            title="Select / Deselect All Logs"
                          />
                          <span className="text-[9px] font-mono lowercase text-white/60">all</span>
                        </div>
                      </th>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Species Details</th>
                      <th className="px-6 py-4">DBH (cm)</th>
                      <th className="px-6 py-4">Canopy (m) / Area (m²)</th>
                      <th className="px-6 py-4 text-emerald-400">CO₂e (kg)</th>
                      <th className="px-6 py-4 text-sky-400">PM2.5 (mg/hr)</th>
                      <th className="px-6 py-4 text-blue-400">Stormwater (L)</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-white/10 font-mono text-white/80 bg-transparent">
                    <AnimatePresence initial={false}>
                      {logs.map((log) => (
                        <motion.tr 
                          key={log.id} 
                          layout
                          initial={{ opacity: 0, y: -12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          className={`hover:bg-slate-800/40 transition-colors ${selectedLogIds.includes(log.id) ? 'bg-emerald-950/5' : 'opacity-60 hover:opacity-100'}`}
                        >
                          <td className="px-6 py-4 text-center w-16">
                            <input 
                              type="checkbox"
                              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/30 bg-slate-950 cursor-pointer w-3.5 h-3.5 accent-emerald-500"
                              checked={selectedLogIds.includes(log.id)}
                              onChange={() => {
                                setSelectedLogIds(prev => 
                                  prev.includes(log.id)
                                    ? prev.filter(id => id !== log.id)
                                    : [...prev, log.id]
                                );
                              }}
                              title="Include in aggregate comparative chart"
                            />
                          </td>
                          <td className="px-6 py-4 text-white/40 font-bold">{log.id}</td>
                          <td className="px-6 py-4">
                            <div className="font-sans font-semibold text-white/90">{log.speciesName}</div>
                            <div className="text-[10px] text-white/40 italic font-serif">{log.scientificName}</div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-white/80">{log.dbh.toFixed(1)}</td>
                          <td className="px-6 py-4">
                            <div className="text-white/80">{log.canopyDiameter.toFixed(1)} m</div>
                            <div className="text-[10px] text-white/40">{log.canopyArea.toFixed(1)} m²</div>
                          </td>
                          <td className="px-6 py-4 text-emerald-400 font-semibold">{log.co2e.toFixed(1)}</td>
                          <td className="px-6 py-4 text-sky-400 font-semibold">{log.pm25.toFixed(1)}</td>
                          <td className="px-6 py-4 text-blue-400 font-semibold">{log.stormwater.toFixed(1)}</td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1.5 hover:bg-red-950/80 rounded-lg text-white/40 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20 cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>

                {/* Mobile Card-Based List Layout */}
                <div className="block md:hidden divide-y divide-white/10">
                  {/* Select All Switch for Mobile */}
                  <div className="px-5 py-3.5 bg-white/[0.01] flex items-center justify-between text-xs text-white/60 border-b border-white/15">
                    <label className="flex items-center gap-3 cursor-pointer py-1 select-none font-semibold">
                      <input 
                        type="checkbox"
                        className="rounded border-white/10 text-emerald-500 focus:ring-emerald-500/30 bg-slate-950 cursor-pointer w-4 h-4 accent-emerald-500"
                        checked={logs.length > 0 && selectedLogIds.length === logs.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLogIds(logs.map(log => log.id));
                          } else {
                            setSelectedLogIds([]);
                          }
                        }}
                      />
                      <span>Select All Inventory Assets</span>
                    </label>
                    <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/20">
                      {selectedLogIds.length}/{logs.length}
                    </span>
                  </div>

                  <AnimatePresence initial={false}>
                    {logs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`p-5 space-y-4 transition-colors ${selectedLogIds.includes(log.id) ? 'bg-emerald-950/10' : ''}`}
                      >
                        {/* Top Line: checkbox, info, delete */}
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-3.5 cursor-pointer select-none max-w-[80%]">
                            <input 
                              type="checkbox"
                              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/30 bg-slate-950 cursor-pointer w-4.5 h-4.5 mt-0.5 accent-emerald-500 flex-shrink-0"
                              checked={selectedLogIds.includes(log.id)}
                              onChange={() => {
                                setSelectedLogIds(prev => 
                                  prev.includes(log.id)
                                    ? prev.filter(id => id !== log.id)
                                    : [...prev, log.id]
                                );
                              }}
                            />
                            <div>
                              <div className="font-sans font-bold text-sm text-white/95 leading-tight">{log.speciesName}</div>
                              <div className="text-[10px] text-white/40 italic font-serif mt-1">{log.scientificName}</div>
                            </div>
                          </label>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[9px] font-mono font-bold text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">{log.id}</span>
                            <button 
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-2 hover:bg-red-950/80 rounded-lg text-white/40 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20 cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Dimensions parameters */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-3 rounded-xl border border-white/5 text-center text-xs">
                          <div>
                            <span className="text-[9px] text-white/40 uppercase tracking-wider block mb-0.5 font-sans font-semibold">Trunk DBH</span>
                            <span className="font-mono font-bold text-white/90">{log.dbh.toFixed(1)} cm</span>
                          </div>
                          <div className="border-l border-white/5">
                            <span className="text-[9px] text-white/40 uppercase tracking-wider block mb-0.5 font-sans font-semibold">Canopy</span>
                            <span className="font-mono font-bold text-white/90">{log.canopyDiameter.toFixed(1)} m <span className="text-[9px] text-white/30">({log.canopyArea.toFixed(0)}m²)</span></span>
                          </div>
                        </div>

                        {/* Comparative metric columns */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-2.5">
                            <div className="flex items-center justify-center gap-1 text-emerald-400">
                              <Leaf className="w-3.5 h-3.5" />
                              <span className="text-[9px] uppercase tracking-wider font-bold">CO₂e</span>
                            </div>
                            <div className="text-xs font-mono font-bold text-white mt-1">{log.co2e.toFixed(1)} <span className="text-[9px] text-white/40 font-normal">kg</span></div>
                          </div>

                          <div className="bg-sky-500/[0.02] border border-sky-500/10 rounded-xl p-2.5">
                            <div className="flex items-center justify-center gap-1 text-sky-400">
                              <Wind className="w-3.5 h-3.5" />
                              <span className="text-[9px] uppercase tracking-wider font-bold">PM₂.₅</span>
                            </div>
                            <div className="text-xs font-mono font-bold text-white mt-1">{log.pm25.toFixed(0)} <span className="text-[9px] text-white/40 font-normal">mg</span></div>
                          </div>

                          <div className="bg-blue-500/[0.02] border border-blue-500/10 rounded-xl p-2.5">
                            <div className="flex items-center justify-center gap-1 text-blue-400">
                              <Droplets className="w-3.5 h-3.5" />
                              <span className="text-[9px] uppercase tracking-wider font-bold">Rain</span>
                            </div>
                            <div className="text-xs font-mono font-bold text-white mt-1">{log.stormwater.toFixed(1)} <span className="text-[9px] text-white/40 font-normal">L</span></div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="py-16 text-center space-y-3 bg-white/[0.01]">
                <div className="inline-flex p-3 bg-white/[0.02] text-white/40 rounded-2xl border border-white/10">
                  <TreeDeciduous className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/80">No tree inventory assets logged yet</h3>
                  <p className="text-xs text-white/40 max-w-sm mx-auto mt-1 leading-relaxed">
                    Set your morphological dimensions in the sidebar, choose a peer-reviewed species dataset, and log your first surveyed asset.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comparative Benefit Analysis Chart */}
        <div className="bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/20 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Comparative Benefit Analytics
              </h2>
              <p className="text-xs text-white/60 mt-1">
                A side-by-side performance evaluation of the current model against logged stand aggregates.
              </p>
            </div>
            {/* Metric select buttons */}
            <div className="flex bg-white/[0.02] backdrop-blur-md p-1 rounded-xl border border-white/10 self-start md:self-auto gap-1 overflow-x-auto max-w-full">
              <button
                onClick={() => setChartMetric('carbon')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  chartMetric === 'carbon'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'text-white/60 border-transparent hover:bg-white/[0.02] hover:text-white/90'
                }`}
              >
                Carbon Sequestration
              </button>
              <button
                onClick={() => setChartMetric('pm25')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  chartMetric === 'pm25'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/30 shadow-lg shadow-teal-500/10'
                    : 'text-white/60 border-transparent hover:bg-white/[0.02] hover:text-white/90'
                }`}
              >
                Air Quality
              </button>
              <button
                onClick={() => setChartMetric('stormwater')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  chartMetric === 'stormwater'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30 shadow-lg shadow-sky-500/10'
                    : 'text-white/60 border-transparent hover:bg-white/[0.02] hover:text-white/90'
                }`}
              >
                Hydrology
              </button>
            </div>
          </div>

          {mounted ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Stats card column */}
              <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="bg-white/[0.02] rounded-xl p-4 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Current Model contribution</span>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      {chartMetric === 'carbon' && `${metrics.co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO₂e`}
                      {chartMetric === 'pm25' && `${metrics.pm25Intercepted.toLocaleString(undefined, { maximumFractionDigits: 1 })} mg/hr`}
                      {chartMetric === 'stormwater' && `${metrics.stormwater.toLocaleString(undefined, { maximumFractionDigits: 1 })} Liters`}
                    </div>
                    <p className="text-[10px] text-white/60 mt-1 leading-relaxed">
                      Based on current interactive slider configurations ({dbh.toFixed(1)} cm DBH, {canopyDiameter.toFixed(1)} m canopy).
                    </p>
                  </div>

                  <div className="bg-white/[0.02] rounded-xl p-4 border border-white/10">
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Selected Stand Total</span>
                    <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                      {chartMetric === 'carbon' && `${selectedTotals.co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO₂e`}
                      {chartMetric === 'pm25' && `${selectedTotals.pm25.toLocaleString(undefined, { maximumFractionDigits: 1 })} mg/hr`}
                      {chartMetric === 'stormwater' && `${selectedTotals.stormwater.toLocaleString(undefined, { maximumFractionDigits: 1 })} Liters`}
                    </div>
                    <p className="text-[10px] text-white/60 mt-1 leading-relaxed">
                      Aggregated across the {selectedTotals.count} selected inventory assets (out of {logs.length} total).
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.01] rounded-xl border border-white/10 text-[10px] text-white/40 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-white/40 inline-block mr-1 align-text-bottom" />
                  Compare the relative performance of your single current model against selected logged assets. Use checkboxes in the Field Report to toggle inclusion.
                </div>
              </div>

              {/* Recharts chart render */}
              <div className="lg:col-span-8 bg-white/[0.02] rounded-xl p-4 border border-white/10 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: 'Current Tree Model',
                        value: chartMetric === 'carbon' 
                          ? metrics.co2e 
                          : chartMetric === 'pm25' 
                          ? metrics.pm25Intercepted 
                          : metrics.stormwater,
                        color: chartMetric === 'carbon' ? '#10b981' : chartMetric === 'pm25' ? '#0ea5e9' : '#3b82f6',
                      },
                      {
                        name: 'Selected Stand Total',
                        value: chartMetric === 'carbon' 
                          ? selectedTotals.co2e 
                          : chartMetric === 'pm25' 
                          ? selectedTotals.pm25 
                          : selectedTotals.stormwater,
                        color: '#6366f1',
                      }
                    ]}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                      unit={chartMetric === 'carbon' ? ' kg' : chartMetric === 'pm25' ? ' mg' : ' L'}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const value = payload[0].value as number;
                          const unit = chartMetric === 'carbon' ? ' kg CO₂e' : chartMetric === 'pm25' ? ' mg/hr PM2.5' : ' Liters of water';
                          return (
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl font-sans">
                              <p className="text-xs font-bold text-white mb-1">{data.name}</p>
                              <p className="text-sm font-mono font-bold" style={{ color: data.color }}>
                                {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}{unit}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[6, 6, 0, 0]}
                      maxBarSize={60}
                    >
                      {
                        [
                          { color: chartMetric === 'carbon' ? '#10b981' : chartMetric === 'pm25' ? '#0ea5e9' : '#3b82f6' },
                          { color: '#6366f1' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-[280px] bg-white/[0.02] rounded-xl border border-white/10 flex items-center justify-center text-white/40 font-mono text-xs">
              Initializing Analytics Modules...
            </div>
          )}
        </div>

        {/* Methodology & Background Documentation */}
        <section id="methodology" className="bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/20 p-6 space-y-4 animate-in">
          <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Info className="w-4 h-4 text-emerald-400" />
            Theoretical Framework & Scientific References
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-white/60 leading-relaxed">
            <div className="space-y-2">
              <h4 className="font-semibold text-white/80 uppercase tracking-wider text-[10px]">Allometric Dry Biomass</h4>
              <p>
                Equations utilize power-law relationships established by the Forest Research Institute of India (FRI) and western sylvicultural stations. Species-specific parameters map trunk Diameter at Breast Height (DBH) to aboveground dry weight, with a standard carbon mass fraction assumption of 50%.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-white/80 uppercase tracking-wider text-[10px]">i-Tree PM2.5 Deposition</h4>
              <p>
                Modeled after the US Forest Service i-Tree Eco methodology. Deposition velocity (Vd) is dynamically adjusted for local wind speed and species-specific leaf morphology. Needle structure in conifers provides greater turbulence, accelerating deposition relative to smoother deciduous surfaces.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-white/80 uppercase tracking-wider text-[10px]">Ecohydrological Rain Retention</h4>
              <p>
                Stormwater mitigations scale with Canopy Water Storage capacity (Sc) and Leaf Area Index (LAI). Leaf Area Index measures multi-layered canopy density per square meter of ground projection, which dictates the total holding volume of rainfall before stemflow or canopy saturation occurs.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Dynamic Undo Toast Notification */}
      <AnimatePresence>
        {showUndoToast && recentlyDeletedLog && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-slate-950/95 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl p-4 overflow-hidden flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Record Removed</div>
                  <div className="text-[10px] text-white/40 mt-0.5 truncate max-w-[180px]">
                    {recentlyDeletedLog.log.speciesName} ({recentlyDeletedLog.log.id})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndoDelete}
                  className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 hover:border-emerald-500/35 text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => setShowUndoToast(false)}
                  className="p-1 text-white/30 hover:text-white/60 rounded transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Countdown timer line animation */}
            <div className="h-1 bg-white/5 rounded-full overflow-hidden absolute bottom-0 left-0 right-0">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className="h-full bg-rose-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
