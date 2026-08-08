'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { calculatePM25Deposition, getAQICategory } from '@/lib/pm25';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
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
  Snowflake,
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
  RotateCcw,
  Gauge,
  Navigation,
  Globe,
  ShieldAlert
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
  lat?: number;
  lon?: number;
  locationName?: string;
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
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [inspectingMetric, setInspectingMetric] = useState<'carbon' | 'air' | 'hydrology' | null>(null);
  const [chartMetric, setChartMetric] = useState<'carbon' | 'pm25' | 'stormwater'>('carbon');
  const [trajectoryChartMetric, setTrajectoryChartMetric] = useState<'co2e' | 'netGain'>('co2e');

  // Seasonal State Toggle
  const [seasonalMode, setSeasonalMode] = useState<'summer' | 'winter'>('summer');

  // Botanical Growth Projections Compounding Expander State
  const [expandedCompoundingYear, setExpandedCompoundingYear] = useState<number | null>(null);

  // Custom Dropdown & Filtering States
  const [isSpeciesDropdownOpen, setIsSpeciesDropdownOpen] = useState(false);
  const [speciesSearchQuery, setSpeciesSearchQuery] = useState('');
  const [speciesTypeFilter, setSpeciesTypeFilter] = useState<'All' | 'Conifer' | 'Broadleaf'>('All');

  // Undo Delete Toast States
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [recentlyDeletedLog, setRecentlyDeletedLog] = useState<{ log: LoggedTree; index: number } | null>(null);  // Live Location and Weather/AQI state - preloaded with FRI Dehradun metrics for instant precision loading
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lon: number } | null>({ lat: 30.316500, lon: 78.032200 });
  const [liveLocationName, setLiveLocationName] = useState<string>('Forest Research Institute (FRI HQ), Dehradun, Uttarakhand, India');
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(4.5); // meters
  const [liveLocationDetail, setLiveLocationDetail] = useState<{
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    suburb?: string;
    source: 'GPS Satellite' | 'Reverse Geocoded' | 'IP Triangulation' | 'Manual Search';
  }>({
    city: 'Dehradun',
    state: 'Uttarakhand',
    country: 'India',
    postcode: '248006',
    suburb: 'FRI Campus',
    source: 'GPS Satellite'
  });

  const [weatherData, setWeatherData] = useState<{
    temp: number;
    apparentTemp: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDir: number;
    windGusts: number;
    cloudCover: number;
    dewPoint: number;
    elevation: number;
    pm25: number;
    pm10: number;
    co: number;
    no2: number;
    so2: number;
    ozone: number;
    usAqi: number;
    dust: number;
    lastSyncedIso: string;
  } | null>({
    temp: 24.5,
    apparentTemp: 25.1,
    humidity: 62,
    pressure: 938.5,
    windSpeed: 2.8,
    windDir: 120,
    windGusts: 4.2,
    cloudCover: 18,
    dewPoint: 16.8,
    elevation: 640,
    pm25: 42.0,
    pm10: 68.4,
    co: 280,
    no2: 24.5,
    so2: 8.2,
    ozone: 34.2,
    usAqi: 117,
    dust: 12.4,
    lastSyncedIso: new Date().toISOString()
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
      if (cachedWeather) {
        try {
          const parsed = JSON.parse(cachedWeather);
          setWeatherData({
            temp: 24.5,
            apparentTemp: 25.1,
            humidity: 62,
            pressure: 938.5,
            windSpeed: 2.8,
            windDir: 120,
            windGusts: 4.2,
            cloudCover: 18,
            dewPoint: 16.8,
            elevation: 640,
            pm25: 42.0,
            pm10: 68.4,
            co: 280,
            no2: 24.5,
            so2: 8.2,
            ozone: 34.2,
            usAqi: 117,
            dust: 12.4,
            lastSyncedIso: new Date().toISOString(),
            ...parsed,
          });
        } catch {}
      }
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

  const fetchTelemetry = useCallback(async (
    lat: number, 
    lon: number, 
    locationLabel?: string, 
    accuracy?: number | null,
    source: 'GPS Satellite' | 'Reverse Geocoded' | 'IP Triangulation' | 'Manual Search' = 'GPS Satellite',
    silent: boolean = false
  ) => {
    if (!silent) {
      setLoadingLive(true);
      setLiveError(null);
    }
    setLiveLocation({ lat, lon });
    if (typeof accuracy === 'number') {
      setLiveAccuracy(accuracy);
    } else if (source === 'Manual Search' || source === 'Reverse Geocoded') {
      setLiveAccuracy(1.0);
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || '';
          const state = addr.state || addr.region || '';
          const country = addr.country || '';
          const postcode = addr.postcode || '';

          setLiveLocationDetail({ city, state, country, postcode, suburb, source });

          if (!locationLabel) {
            const parts = [suburb, city, state, country].filter(Boolean);
            const formattedName = parts.length > 0 ? parts.join(', ') : `${lat.toFixed(6)}°, ${lon.toFixed(6)}°`;
            setLiveLocationName(formattedName);
          } else {
            setLiveLocationName(locationLabel);
          }
        } else if (locationLabel) {
          setLiveLocationName(locationLabel);
        }
      } else if (locationLabel) {
        setLiveLocationName(locationLabel);
      }
    } catch {
      if (locationLabel) setLiveLocationName(locationLabel);
    }

    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,dew_point_2m&wind_speed_unit=ms`;
      const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,dust`;

      const [weatherRes, aqRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(aqUrl)
      ]);

      if (!weatherRes.ok || !aqRes.ok) {
        throw new Error('Failed to retrieve precision atmospheric telemetry.');
      }

      const weatherJson = await weatherRes.json();
      const aqJson = await aqRes.json();

      const wCurr = weatherJson.current || {};
      const aqCurr = aqJson.current || {};

      const windMPS = Number((wCurr.wind_speed_10m ?? 2.8).toFixed(2));
      const elevation = typeof weatherJson.elevation === 'number' ? weatherJson.elevation : 640;

      const parsedWeather = {
        temp: Number((wCurr.temperature_2m ?? 24.5).toFixed(1)),
        apparentTemp: Number((wCurr.apparent_temperature ?? wCurr.temperature_2m ?? 24.5).toFixed(1)),
        humidity: Number((wCurr.relative_humidity_2m ?? 60).toFixed(0)),
        pressure: Number((wCurr.surface_pressure ?? 1013.25).toFixed(1)),
        windSpeed: windMPS,
        windDir: Math.round(wCurr.wind_direction_10m ?? 120),
        windGusts: Number((wCurr.wind_gusts_10m ?? windMPS * 1.4).toFixed(1)),
        cloudCover: Math.round(wCurr.cloud_cover ?? 15),
        dewPoint: Number((wCurr.dew_point_2m ?? 16.5).toFixed(1)),
        elevation: Math.round(elevation),
        pm25: Number((aqCurr.pm2_5 ?? 42.0).toFixed(1)),
        pm10: Number((aqCurr.pm10 ?? 68.4).toFixed(1)),
        co: Number((aqCurr.carbon_monoxide ?? 280).toFixed(0)),
        no2: Number((aqCurr.nitrogen_dioxide ?? 24.5).toFixed(1)),
        so2: Number((aqCurr.sulphur_dioxide ?? 8.2).toFixed(1)),
        ozone: Number((aqCurr.ozone ?? 34.2).toFixed(1)),
        usAqi: Math.round(aqCurr.us_aqi ?? 115),
        dust: Number((aqCurr.dust ?? 12.0).toFixed(1)),
        lastSyncedIso: new Date().toISOString()
      };

      setWeatherData(parsedWeather);
      setPm25(Math.max(2, Math.min(500, Math.round(parsedWeather.pm25))));
      setWindSpeed(Math.max(0.1, Math.min(25, windMPS)));
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
    // Attempt 1: ipwho.is
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const label = data.city ? `${data.city}, ${data.country || ''}` : `${data.country || 'IP Location'}`;
          await fetchTelemetry(data.latitude, data.longitude, label + ' (IP Triangulation)', null, 'IP Triangulation', silent);
          return;
        }
      }
    } catch {
      // quiet fallback
    }

    // Attempt 2: freeipapi.com
    try {
      const res = await fetch('https://freeipapi.com/api/json');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const label = data.cityName ? `${data.cityName}, ${data.countryName || ''}` : `${data.countryName || 'IP Location'}`;
          await fetchTelemetry(data.latitude, data.longitude, label + ' (IP Triangulation)', null, 'IP Triangulation', silent);
          return;
        }
      }
    } catch {
      // quiet fallback
    }

    // Attempt 3: ipapi.co
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const label = data.city ? `${data.city}, ${data.country_name || ''}` : `${data.country_name || 'IP Location'}`;
          await fetchTelemetry(data.latitude, data.longitude, label + ' (IP Triangulation)', null, 'IP Triangulation', silent);
          return;
        }
      }
    } catch {
      // quiet fallback
    }

    // Attempt 4: Ultimate static fallback (FRI HQ, India)
    await fetchTelemetry(30.316500, 78.032200, 'Forest Research Institute (FRI HQ), Dehradun, India', 4.5, 'GPS Satellite', silent);
  }, [fetchTelemetry]);

  useEffect(() => {
    if (!mounted) return;

    const hasCachedTelemetry = localStorage.getItem('ecoarbor_weatherData');
    if (hasCachedTelemetry) return;

    const timer = setTimeout(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            fetchTelemetry(lat, lon, undefined, accuracy, 'GPS Satellite', true);
          },
          () => {
            fetchIPFallback(true);
          },
          { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 }
        );
      } else {
        fetchIPFallback(true);
      }
    }, 500);

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
          const accuracy = position.coords.accuracy;
          fetchTelemetry(lat, lon, undefined, accuracy, 'GPS Satellite');
        },
        () => {
          fetchIPFallback();
        },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
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
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearchQuery)}&format=json&addressdetails=1&limit=3&accept-language=en`);
      if (!res.ok) {
        throw new Error('Search request failed. Please try again.');
      }
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const displayName = item.display_name;
        const parts = displayName.split(',');
        const shortLabel = parts.slice(0, 3).join(',').trim();
        await fetchTelemetry(lat, lon, shortLabel, 1.0, 'Manual Search');
        setLocationSearchQuery('');
      } else {
        throw new Error('Location not found. Please enter a valid city or district.');
      }
    } catch (err: any) {
      setLiveError(err.message || 'Error searching location.');
      setLoadingLive(false);
    }
  };

  const activeSpecies = useMemo(() => speciesData.find(s => s.id === selectedSpeciesId) || speciesData[0], [selectedSpeciesId]);

  // Real scientific equations computed dynamically with microclimate air density and multi-pollutant factors
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
    const carbonContent = M * 0.50; // 50% carbon fraction
    const co2e = carbonContent * (44.01 / 12.011);

    // C. Canopy Area (A, m²)
    const canopyArea = Math.PI * Math.pow(canopyDiameter / 2, 2);

    // Resistance-based PM2.5 Deposition Model with Microclimate Adjustments
    const pm25Calc = calculatePM25Deposition({
      windSpeed,
      LAI: activeLai,
      canopyDiameter,
      ambientPM25: pm25,
      speciesLeafType: activeSpecies.type,
      temperature: weatherData?.temp ?? 25,
      relativeHumidity: weatherData?.humidity ?? 50,
      surfacePressure: weatherData?.pressure ?? 1013.25,
      ambientPM10: weatherData?.pm10,
      ambientNO2: weatherData?.no2,
      ambientSO2: weatherData?.so2,
      ambientOzone: weatherData?.ozone,
      ambientCO: weatherData?.co,
    });

    // D. Canopy Stormwater Interception (I, Liters)
    const stormwater = activeSc * activeLai * canopyArea;

    return {
      biomass: M,
      carbonContent,
      co2e,
      canopyArea,
      vdMPS: pm25Calc.vdMPS,
      vdPerHour: pm25Calc.vdPerHour,
      flux: pm25Calc.flux,
      pm25Intercepted: pm25Calc.pm25Intercepted,
      pm10Intercepted: pm25Calc.pm10Intercepted,
      no2Intercepted: pm25Calc.no2Intercepted,
      so2Intercepted: pm25Calc.so2Intercepted,
      ozoneIntercepted: pm25Calc.ozoneIntercepted,
      coIntercepted: pm25Calc.coIntercepted,
      airDensity: pm25Calc.airDensity,
      pm25Details: pm25Calc,
      stormwater,
      activeLai,
      activeSc
    };
  }, [activeSpecies, dbh, canopyDiameter, pm25, windSpeed, seasonalMode, weatherData]);

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

    const getMetricsForDimensions = (projectedDbh: number, projectedCanopyDiam: number, horizonYears: number) => {
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

      const pm25CalcProj = calculatePM25Deposition({
        windSpeed,
        LAI: activeLai,
        canopyDiameter: projectedCanopyDiam,
        ambientPM25: pm25,
        speciesLeafType: activeSpecies.type,
        temperature: weatherData?.temp ?? 25,
        relativeHumidity: weatherData?.humidity ?? 50,
        surfacePressure: weatherData?.pressure ?? 1013.25,
        ambientPM10: weatherData?.pm10,
        ambientNO2: weatherData?.no2,
        ambientSO2: weatherData?.so2,
        ambientOzone: weatherData?.ozone,
        ambientCO: weatherData?.co,
      });
      const pm25Intercepted = pm25CalcProj.pm25Intercepted;
      const stormwater = activeSc * activeLai * canopyArea;

      const netCo2Gain = Math.max(0, co2e - metrics.co2e);
      const avgAnnualRate = netCo2Gain / horizonYears;
      const carMilesEquivalent = co2e / 0.404; // 0.404 kg CO2 per mile driven
      const matureTreeYearsEquiv = co2e / 21.8; // ~21.8 kg CO2/yr for mature tree

      return { 
        dbh: projectedDbh, 
        canopyDiameter: projectedCanopyDiam, 
        co2e, 
        pm25: pm25Intercepted, 
        stormwater,
        netCo2Gain,
        avgAnnualRate,
        carMilesEquivalent,
        matureTreeYearsEquiv
      };
    };

    return [
      { year: 10, ...getMetricsForDimensions(dbh + dbhGrowthPerYear * 10, canopyDiameter + canopyGrowthPerYear * 10, 10) },
      { year: 20, ...getMetricsForDimensions(dbh + dbhGrowthPerYear * 20, canopyDiameter + canopyGrowthPerYear * 20, 20) },
      { year: 50, ...getMetricsForDimensions(dbh + dbhGrowthPerYear * 50, canopyDiameter + canopyGrowthPerYear * 50, 50) },
    ];
  }, [activeSpecies, dbh, canopyDiameter, pm25, windSpeed, seasonalMode, metrics.co2e, weatherData]);

  // 50-Year Growth & Sequestration Trajectory Curve Data (for recharts Line/Area Chart)
  const growthTrajectoryData = useMemo(() => {
    let dbhGrowthPerYear = 0.8; 
    if (activeSpecies.family.includes('Moraceae') || activeSpecies.name.includes('Fig')) {
      dbhGrowthPerYear = 1.2; 
    } else if (activeSpecies.name.includes('Cedar') || activeSpecies.name.includes('Pine')) {
      dbhGrowthPerYear = 0.6; 
    } else if (activeSpecies.name.includes('Teak') || activeSpecies.name.includes('Oak')) {
      dbhGrowthPerYear = 0.95; 
    }
    const canopyGrowthPerYear = dbhGrowthPerYear * 0.2; 

    const years = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
    return years.map(y => {
      const projDbh = dbh + dbhGrowthPerYear * y;
      const projCanopy = canopyDiameter + canopyGrowthPerYear * y;
      let M = 0;
      if (activeSpecies.equationType === 'power') {
        M = activeSpecies.a * Math.pow(projDbh, activeSpecies.b);
      } else {
        M = Math.exp(activeSpecies.a + activeSpecies.b * Math.log(projDbh));
      }
      const carbonContent = M * 0.50;
      const totalCo2e = Number((carbonContent * (44.01 / 12.011)).toFixed(1));
      const netGain = Number(Math.max(0, totalCo2e - metrics.co2e).toFixed(1));

      return {
        year: y,
        yearLabel: y === 0 ? 'Present (0 Yr)' : `+${y} Yrs`,
        co2e: totalCo2e,
        netGain: netGain,
        dbh: Number(projDbh.toFixed(1)),
        canopy: Number(projCanopy.toFixed(1)),
        isMilestone: y === 0 || y === 10 || y === 20 || y === 50
      };
    });
  }, [activeSpecies, dbh, canopyDiameter, metrics.co2e]);

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

  // Format logs for Map representation with latitude and longitude fallback calculations
  const treesForMap = useMemo(() => {
    return logs.map((log, index) => {
      const baseLat = liveLocation?.lat ?? 30.3165;
      const baseLon = liveLocation?.lon ?? 78.0322;
      const defaultLat = baseLat + (index * 0.0006 * Math.sin(index + 1));
      const defaultLon = baseLon + (index * 0.0006 * Math.cos(index + 1));
      return {
        ...log,
        lat: log.lat ?? defaultLat,
        lon: log.lon ?? defaultLon
      };
    });
  }, [logs, liveLocation]);

  const handleLogTree = () => {
    const baseLat = liveLocation?.lat ?? 30.3165;
    const baseLon = liveLocation?.lon ?? 78.0322;
    const countNear = logs.filter(l => Math.abs((l.lat ?? baseLat) - baseLat) < 0.005 && Math.abs((l.lon ?? baseLon) - baseLon) < 0.005).length;
    const angle = (countNear * 137.5 * Math.PI) / 180;
    const radius = countNear === 0 ? 0 : 0.0006 + (countNear * 0.0003);
    const lat = baseLat + Math.sin(angle) * radius;
    const lon = baseLon + Math.cos(angle) * radius;

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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lat,
      lon,
      locationName: liveLocationName
    };
    setLogs(prev => [newLog, ...prev]);
    setSelectedLogIds(prev => [newLog.id, ...prev]);

    // Show Added Successfully feedback
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
    }, 2500);
  };

  const handleAddTreeAtLocation = useCallback((lat: number, lon: number, locationName?: string) => {
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      lat,
      lon,
      locationName: locationName || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
    };
    setLogs(prev => [newLog, ...prev]);
    setSelectedLogIds(prev => [newLog.id, ...prev]);

    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
    }, 2500);
  }, [activeSpecies, dbh, canopyDiameter, metrics]);

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
    doc.rect(0, 0, 210, 36, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ECOARBOR STUDIO', 15, 16);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('PRECISION ECOLOGICAL MODELING & IMPACT ASSESSMENT REPORT', 15, 23);
    doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 15, 29);
    
    // Field Assessment Metadata
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FIELD ASSESSMENT METADATA', 15, 43);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Active Survey Location: ${liveLocationName || 'Dehradun, India (FRI HQ)'} (${liveLocation?.lat != null && liveLocation?.lon != null ? `${liveLocation.lat.toFixed(4)}°N, ${liveLocation.lon.toFixed(4)}°E` : 'Auto-localized GPS'})`, 15, 49);
    doc.text(`Ambient Air Quality (PM2.5): ${(weatherData?.pm25 ?? 42.0).toFixed(1)} ug/m3  |  Ambient Wind Speed: ${(weatherData?.windSpeed ?? 2.8).toFixed(1)} m/s`, 15, 54);

    // ==========================================
    // VISUAL SUMMARY CHART: AGGREGATE STAND BENEFITS
    // ==========================================
    const chartBoxY = 60;
    const chartBoxHeight = 82;
    
    // Background card container
    doc.setFillColor(245, 252, 247);
    doc.setDrawColor(200, 228, 208);
    doc.roundedRect(15, chartBoxY, 180, chartBoxHeight, 3, 3, 'FD');
    
    // Header bar inside card
    doc.setFillColor(2, 48, 32);
    doc.rect(15, chartBoxY, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('AGGREGATE STAND ECOSYSTEM BENEFITS - VISUAL SUMMARY CHART', 20, chartBoxY + 5.5);
    
    // Benefit Metrics Visual Bars
    // Compute reference values for bar scaling
    const co2Val = standTotals.count > 0 ? standTotals.co2e : metrics.co2e;
    const pmVal = standTotals.count > 0 ? standTotals.pm25 : metrics.pm25Intercepted;
    const stormVal = standTotals.count > 0 ? standTotals.stormwater : metrics.stormwater;

    // Define standard benchmark scale targets for meaningful relative comparison
    // Reference benchmarks scale dynamically to accommodate growing stands while maintaining clear visual ratios
    const targetCo2 = Math.max(500, Math.ceil((co2Val + 1) / 250) * 250);
    const targetPm25 = Math.max(500, Math.ceil((pmVal + 1) / 250) * 250);
    const targetWater = Math.max(500, Math.ceil((stormVal + 1) / 250) * 250);

    const co2Pct = Math.min(100, (co2Val / targetCo2) * 100);
    const pmPct = Math.min(100, (pmVal / targetPm25) * 100);
    const stormPct = Math.min(100, (stormVal / targetWater) * 100);

    const barTrackX = 112;
    const barTrackW = 66;

    // Scale Ticks Header Row above bars
    let barStartY = chartBoxY + 13;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(80, 120, 95);
    doc.text('METRIC & STAND OUTPUT', 20, barStartY);
    doc.text('PERFORMANCE vs BENCHMARK TARGET (0% - 100%)', barTrackX, barStartY);

    // Draw scale grid ticks (0%, 25%, 50%, 75%, 100%)
    [0, 0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
      const tickX = barTrackX + ratio * barTrackW;
      doc.setDrawColor(215, 235, 220);
      doc.setLineDashPattern([1, 1.5], 0);
      doc.line(tickX, barStartY + 2, tickX, barStartY + 28);
      doc.setLineDashPattern([], 0);
    });

    // 1. Carbon Bar
    barStartY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 70, 45);
    doc.text('Carbon Stored (CO2e):', 20, barStartY + 3.5);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`${co2Val.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`, 60, barStartY + 3.5);
    
    // Bar Track & Fill
    doc.setFillColor(225, 238, 228);
    doc.roundedRect(barTrackX, barStartY, barTrackW, 4.5, 1.2, 1.2, 'F');
    const co2FillW = Math.max(2, (barTrackW * co2Pct) / 100);
    doc.setFillColor(16, 185, 129); // Emerald
    doc.roundedRect(barTrackX, barStartY, co2FillW, 4.5, 1.2, 1.2, 'F');

    // Percentage & Target Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(16, 120, 60);
    doc.text(`${co2Pct.toFixed(0)}%`, barTrackX + barTrackW + 3, barStartY + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`(ref: ${targetCo2}kg target)`, 20, barStartY + 7);

    // 2. Air Quality Bar
    barStartY += 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 100, 100);
    doc.text('PM2.5 Intercepted:', 20, barStartY + 3.5);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`${pmVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} mg/hr`, 60, barStartY + 3.5);
    
    doc.setFillColor(220, 238, 238);
    doc.roundedRect(barTrackX, barStartY, barTrackW, 4.5, 1.2, 1.2, 'F');
    const pmFillW = Math.max(2, (barTrackW * pmPct) / 100);
    doc.setFillColor(20, 184, 166); // Teal
    doc.roundedRect(barTrackX, barStartY, pmFillW, 4.5, 1.2, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 110, 110);
    doc.text(`${pmPct.toFixed(0)}%`, barTrackX + barTrackW + 3, barStartY + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`(ref: ${targetPm25}mg target)`, 20, barStartY + 7);

    // 3. Hydrology Bar
    barStartY += 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(10, 80, 140);
    doc.text('Stormwater Retained:', 20, barStartY + 3.5);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`${stormVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} Liters`, 60, barStartY + 3.5);
    
    doc.setFillColor(220, 232, 245);
    doc.roundedRect(barTrackX, barStartY, barTrackW, 4.5, 1.2, 1.2, 'F');
    const stormFillW = Math.max(2, (barTrackW * stormPct) / 100);
    doc.setFillColor(2, 132, 199); // Sky
    doc.roundedRect(barTrackX, barStartY, stormFillW, 4.5, 1.2, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(2, 110, 170);
    doc.text(`${stormPct.toFixed(0)}%`, barTrackX + barTrackW + 3, barStartY + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`(ref: ${targetWater}L target)`, 20, barStartY + 7);

    // Divider line inside card
    barStartY += 8;
    doc.setDrawColor(210, 230, 215);
    doc.line(20, barStartY, 190, barStartY);

    // Section B: Stand Species Composition Distribution (Stacked Bar)
    barStartY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 70, 45);
    doc.text('STAND SPECIES BENEFIT DISTRIBUTION (CO2e SHARE):', 20, barStartY);

    barStartY += 3.5;
    // Stacked Bar
    const stackedBarX = 20;
    const stackedBarW = 170;
    const stackedBarH = 5.5;

    doc.setFillColor(230, 238, 232);
    doc.roundedRect(stackedBarX, barStartY, stackedBarW, stackedBarH, 1.5, 1.5, 'F');

    // Species map computation
    const speciesMap: { [name: string]: { co2e: number; count: number } } = {};
    const palette: [number, number, number][] = [
      [16, 185, 129],  // Emerald
      [2, 132, 199],   // Sky
      [20, 184, 166],  // Teal
      [139, 92, 246],  // Violet
      [245, 158, 11],  // Amber
      [225, 29, 72],   // Rose
    ];

    if (logs.length > 0) {
      logs.forEach(log => {
        if (!speciesMap[log.speciesName]) {
          speciesMap[log.speciesName] = { co2e: 0, count: 0 };
        }
        speciesMap[log.speciesName].co2e += log.co2e;
        speciesMap[log.speciesName].count += 1;
      });
    } else {
      speciesMap[activeSpecies.name] = { co2e: metrics.co2e, count: 1 };
    }

    const speciesEntries = Object.entries(speciesMap);
    const totalCo2Sum = Object.values(speciesMap).reduce((acc, curr) => acc + curr.co2e, 0) || 1;

    let currentSegmentX = stackedBarX;
    speciesEntries.forEach(([_, spData], idx) => {
      const pct = (spData.co2e / totalCo2Sum);
      const segWidth = Math.max(2, pct * stackedBarW);
      const color = palette[idx % palette.length];
      
      doc.setFillColor(color[0], color[1], color[2]);
      if (idx === 0 && speciesEntries.length === 1) {
        doc.roundedRect(currentSegmentX, barStartY, segWidth, stackedBarH, 1.5, 1.5, 'F');
      } else {
        doc.rect(currentSegmentX, barStartY, segWidth, stackedBarH, 'F');
      }
      currentSegmentX += segWidth;
    });

    // Species Legend Below Stacked Bar
    barStartY += 8.5;
    let legendX = 20;
    speciesEntries.slice(0, 5).forEach(([spName, spData], idx) => {
      const pct = ((spData.co2e / totalCo2Sum) * 100).toFixed(0);
      const color = palette[idx % palette.length];
      
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(legendX, barStartY - 2.8, 3, 3, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      const legendText = `${spName} (${pct}%)`;
      doc.text(legendText, legendX + 4.5, barStartY);
      
      legendX += doc.getTextWidth(legendText) + 10;
    });

    // List of Logged Assets
    const inventoryTitleY = chartBoxY + chartBoxHeight + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text('SURVEYED INVENTORY ASSETS', 15, inventoryTitleY);
    
    // Draw table headers
    let startY = inventoryTitleY + 6;
    doc.setFillColor(220, 230, 220);
    doc.rect(15, startY, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 60, 40);
    
    doc.text('ID', 17, startY + 5.5);
    doc.text('SPECIES (SCIENTIFIC NAME)', 29, startY + 5.5);
    doc.text('DBH', 88, startY + 5.5);
    doc.text('CANOPY', 104, startY + 5.5);
    doc.text('CO2e', 122, startY + 5.5);
    doc.text('PM2.5', 142, startY + 5.5);
    doc.text('STORMWATER', 165, startY + 5.5);
    
    // Draw table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    
    if (logs.length > 0) {
      logs.forEach((log, idx) => {
        const rowY = startY + 8 + (idx * 7.5);
        
        // Zebra striping
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 248);
          doc.rect(15, rowY, 180, 7.5, 'F');
        }
        
        doc.text(log.id, 17, rowY + 5);
        
        const fullName = `${log.speciesName} (${log.scientificName})`;
        const displayName = fullName.length > 28 ? fullName.substring(0, 26) + '...' : fullName;
        doc.text(displayName, 29, rowY + 5);
        
        doc.text(`${log.dbh.toFixed(0)}cm`, 88, rowY + 5);
        doc.text(`${log.canopyDiameter.toFixed(1)}m`, 104, rowY + 5);
        doc.text(`${log.co2e.toFixed(1)}kg`, 122, rowY + 5);
        doc.text(`${log.pm25.toFixed(0)}mg`, 142, rowY + 5);
        doc.text(`${log.stormwater.toFixed(1)}L`, 165, rowY + 5);
      });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(130, 130, 130);
      doc.text('No stand inventory assets logged in active session.', 17, startY + 12);
    }

    // BOTANICAL GROWTH & ECOLOGICAL PROJECTIONS SECTION (10, 20 & 50 Years)
    let projSectionY = logs.length > 0 ? startY + 12 + (logs.length * 7.5) : startY + 22;

    // Check if projection section needs a fresh page
    if (projSectionY > 180) {
      doc.addPage();
      projSectionY = 25;
    } else {
      projSectionY += 6;
    }

    // Projection Section Header Block
    doc.setFillColor(2, 48, 32);
    doc.rect(15, projSectionY, 180, 1.5, 'F');
    projSectionY += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text('BOTANICAL GROWTH & ECOLOGICAL PROJECTIONS (10, 20 & 50 YEAR HORIZONS)', 15, projSectionY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Active Species Model: ${activeSpecies.name} (${activeSpecies.scientificName})`, 15, projSectionY + 5.5);
    doc.text(`Baseline Dimensions: ${dbh.toFixed(1)} cm DBH  |  ${canopyDiameter.toFixed(1)} m Canopy  |  Current CO2e: ${metrics.co2e.toFixed(1)} kg`, 15, projSectionY + 10.5);

    // Projection Table Header
    let pTableY = projSectionY + 15;
    doc.setFillColor(230, 242, 235);
    doc.rect(15, pTableY, 180, 8, 'F');
    doc.setDrawColor(200, 220, 205);
    doc.rect(15, pTableY, 180, 8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 80, 45);

    doc.text('HORIZON', 17, pTableY + 5.5);
    doc.text('PROJ. DIMENSIONS', 40, pTableY + 5.5);
    doc.text('TOTAL CO2e', 80, pTableY + 5.5);
    doc.text('NET GROWTH (RATE)', 110, pTableY + 5.5);
    doc.text('AIR & STORMWATER', 148, pTableY + 5.5);

    // Projection Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    growthProjections.forEach((proj, idx) => {
      const rowY = pTableY + 8 + (idx * 16);
      
      // Zebra striping & border
      if (idx % 2 === 1) {
        doc.setFillColor(248, 252, 249);
        doc.rect(15, rowY, 180, 16, 'F');
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(15, rowY, 180, 16, 'F');
      }
      doc.setDrawColor(230, 235, 230);
      doc.rect(15, rowY, 180, 16, 'S');

      // Primary Metric Line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(2, 48, 32);
      doc.text(`${proj.year} Years (${now.getFullYear() + proj.year})`, 17, rowY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(`${proj.dbh.toFixed(1)}cm DBH / ${proj.canopyDiameter.toFixed(1)}m`, 40, rowY + 5.5);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${proj.co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`, 80, rowY + 5.5);
      
      doc.setTextColor(16, 120, 60);
      doc.text(`+${proj.netCo2Gain.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg (~${proj.avgAnnualRate.toFixed(1)}/yr)`, 110, rowY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(`${proj.pm25.toFixed(0)}mg/h | ${proj.stormwater.toFixed(0)}L`, 148, rowY + 5.5);

      // Secondary Line (Equivalencies & Impact)
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Equivalencies: ~${proj.carMilesEquivalent.toLocaleString(undefined, { maximumFractionDigits: 0 })} vehicle miles offset  |  ~${proj.matureTreeYearsEquiv.toFixed(1)} mature tree-years equivalent`,
        17,
        rowY + 12
      );
    });

    let currentPDFY = pTableY + 8 + (growthProjections.length * 16) + 6;

    // ==========================================
    // 50-YEAR CUMULATIVE CARBON SEQUESTRATION TRAJECTORY GRAPH
    // ==========================================
    const trajCardH = 68;
    if (currentPDFY + trajCardH > 275) {
      doc.addPage();
      currentPDFY = 25;
    }

    const trajCardY = currentPDFY;
    doc.setFillColor(245, 252, 247);
    doc.setDrawColor(200, 228, 208);
    doc.roundedRect(15, trajCardY, 180, trajCardH, 3, 3, 'FD');

    // Header Bar
    doc.setFillColor(2, 48, 32);
    doc.rect(15, trajCardY, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('50-YEAR CUMULATIVE CARBON SEQUESTRATION TRAJECTORY (KG CO2e)', 20, trajCardY + 5.5);

    // Subtitle
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(90, 115, 100);
    doc.text('Modeled long-term biomass growth curve & cumulative CO2e storage (kg) milestone horizons.', 20, trajCardY + 13);

    // Graph Plot Parameters
    const plotX = 35;
    const plotW = 150;
    const plotY = trajCardY + 56; // bottom axis line
    const plotH = 34; // height of plot area
    const topY = plotY - plotH;

    const maxTrajCo2 = Math.max(...growthTrajectoryData.map(d => d.co2e), 100);

    // Draw Y-Axis Ticks & Horizontal Grid Lines
    [0, 0.333, 0.666, 1.0].forEach((ratio) => {
      const gy = plotY - ratio * plotH;
      doc.setDrawColor(220, 235, 225);
      doc.setLineDashPattern([1, 1.5], 0);
      doc.line(plotX, gy, plotX + plotW, gy);
      doc.setLineDashPattern([], 0);

      const valLabel = `${Math.round(ratio * maxTrajCo2)}kg`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 120, 110);
      doc.text(valLabel, plotX - 2, gy + 1, { align: 'right' });
    });

    // Draw X-Axis Ticks & Vertical Grid Lines
    const milestoneYears = [0, 10, 20, 30, 40, 50];
    milestoneYears.forEach((yr) => {
      const gx = plotX + (yr / 50) * plotW;
      doc.setDrawColor(220, 235, 225);
      doc.setLineDashPattern([1, 1.5], 0);
      doc.line(gx, topY - 2, gx, plotY);
      doc.setLineDashPattern([], 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(60, 80, 70);
      doc.text(yr === 0 ? 'Yr 0 (Now)' : `Yr ${yr}`, gx, plotY + 4, { align: 'center' });
    });

    // Compute coordinate points
    const points = growthTrajectoryData.map((d) => {
      const px = plotX + (d.year / 50) * plotW;
      const py = plotY - (d.co2e / maxTrajCo2) * plotH;
      return { px, py, year: d.year, co2e: d.co2e };
    });

    // Render Area Shading under curve
    if (points.length > 1) {
      doc.setFillColor(215, 242, 222);
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        doc.triangle(p1.px, plotY, p1.px, p1.py, p2.px, plotY, 'F');
        doc.triangle(p1.px, p1.py, p2.px, p2.py, p2.px, plotY, 'F');
      }

      // Emerald Stroke Line
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.8);
      for (let i = 0; i < points.length - 1; i++) {
        doc.line(points[i].px, points[i].py, points[i + 1].px, points[i + 1].py);
      }
      doc.setLineWidth(0.2); // reset line width

      // Milestone Node Dots & Callouts
      points.filter(p => p.year === 0 || p.year === 10 || p.year === 20 || p.year === 30 || p.year === 40 || p.year === 50).forEach((p) => {
        doc.setFillColor(2, 48, 32);
        doc.circle(p.px, p.py, 1.4, 'F');
        doc.setFillColor(255, 255, 255);
        doc.circle(p.px, p.py, 0.6, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(16, 120, 60);
        const valText = p.co2e >= 1000 ? `${(p.co2e / 1000).toFixed(1)}t` : `${p.co2e.toFixed(0)}kg`;
        doc.text(valText, p.px, p.py - 2.5, { align: 'center' });
      });
    }

    currentPDFY += trajCardH + 8;

    // ==========================================
    // COMPARATIVE BENEFIT ANALYTICS BAR
    // ==========================================
    const compCardH = 64;
    if (currentPDFY + compCardH > 275) {
      doc.addPage();
      currentPDFY = 25;
    }

    const compCardY = currentPDFY;
    doc.setFillColor(245, 252, 247);
    doc.setDrawColor(200, 228, 208);
    doc.roundedRect(15, compCardY, 180, compCardH, 3, 3, 'FD');

    // Header Bar
    doc.setFillColor(2, 48, 32);
    doc.rect(15, compCardY, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('COMPARATIVE BENEFIT ANALYTICS - IMPACT MULTIPLIERS & BENCHMARKS', 20, compCardY + 5.5);

    // Subtitle & Legend
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('Cross-Horizon & Regional Urban Benchmark Comparison', 20, compCardY + 13);

    // Color Legend
    doc.setFillColor(16, 185, 129); // Emerald: Stand Current
    doc.rect(115, compCardY + 10.5, 3, 3, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(60, 60, 60);
    doc.text('Current Stand Asset', 119, compCardY + 13);

    doc.setFillColor(20, 184, 166); // Teal: 50-Yr Horizon
    doc.rect(148, compCardY + 10.5, 3, 3, 'F');
    doc.text('50-Yr Horizon', 152, compCardY + 13);

    doc.setFillColor(100, 116, 139); // Slate: Urban Benchmark
    doc.rect(173, compCardY + 10.5, 3, 3, 'F');
    doc.text('Urban Avg', 177, compCardY + 13);

    // Comparative Metrics Data
    let compBarY = compCardY + 17;

    const proj50 = growthProjections.find(p => p.year === 50);
    const co2_current = standTotals.count > 0 ? standTotals.co2e : metrics.co2e;
    const co2_50yr = proj50 ? (standTotals.count > 1 ? co2_current * (proj50.co2e / (metrics.co2e || 1)) : proj50.co2e) : co2_current * 7.5;

    const maxCo2Comp = Math.max(co2_50yr, 10);
    const barX = 75;
    const barW = 85;

    // Group 1: Carbon Storage Horizon
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(30, 70, 45);
    doc.text('Carbon Storage Horizon:', 20, compBarY + 3);

    doc.setFillColor(225, 238, 228); doc.roundedRect(barX, compBarY, barW, 3.5, 1, 1, 'F');
    doc.setFillColor(16, 185, 129); doc.roundedRect(barX, compBarY, Math.max(2, (barW * (co2_current / maxCo2Comp))), 3.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(16, 120, 60);
    doc.text(`Current: ${co2_current.toFixed(0)} kg (1.0x)`, barX + barW + 2, compBarY + 2.8);

    compBarY += 4.5;
    doc.setFillColor(220, 238, 238); doc.roundedRect(barX, compBarY, barW, 3.5, 1, 1, 'F');
    doc.setFillColor(20, 184, 166); doc.roundedRect(barX, compBarY, Math.max(2, (barW * (co2_50yr / maxCo2Comp))), 3.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(15, 110, 110);
    const mult = (co2_50yr / (co2_current || 1)).toFixed(1);
    doc.text(`50-Yr: ${co2_50yr.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg (${mult}x)`, barX + barW + 2, compBarY + 2.8);

    // Group 2: Air Quality (PM2.5) vs Urban Benchmark
    compBarY += 7.5;
    const pm_current = standTotals.count > 0 ? standTotals.pm25 : metrics.pm25Intercepted;
    const pm_benchmark = 120 * Math.max(1, standTotals.count);
    const maxPmComp = Math.max(pm_current, pm_benchmark, 10);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(15, 100, 100);
    doc.text('Air Quality (PM2.5):', 20, compBarY + 3);

    doc.setFillColor(225, 238, 228); doc.roundedRect(barX, compBarY, barW, 3.5, 1, 1, 'F');
    doc.setFillColor(16, 185, 129); doc.roundedRect(barX, compBarY, Math.max(2, (barW * (pm_current / maxPmComp))), 3.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(16, 120, 60);
    doc.text(`Stand: ${pm_current.toFixed(0)} mg/h`, barX + barW + 2, compBarY + 2.8);

    compBarY += 4.5;
    doc.setFillColor(235, 240, 245); doc.roundedRect(barX, compBarY, barW, 3.5, 1, 1, 'F');
    doc.setFillColor(100, 116, 139); doc.roundedRect(barX, compBarY, Math.max(2, (barW * (pm_benchmark / maxPmComp))), 3.5, 1, 1, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text(`Urban Avg: ${pm_benchmark.toFixed(0)} mg/h`, barX + barW + 2, compBarY + 2.8);

    // Group 3: Stormwater Retention vs Urban Benchmark
    compBarY += 7.5;
    const storm_current = standTotals.count > 0 ? standTotals.stormwater : metrics.stormwater;
    const storm_benchmark = 650 * Math.max(1, standTotals.count);
    const maxStormComp = Math.max(storm_current, storm_benchmark, 10);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(10, 80, 140);
    doc.text('Stormwater Retained:', 20, compBarY + 3);

    doc.setFillColor(225, 238, 228); doc.roundedRect(barX, compBarY, barW, 3.5, 1, 1, 'F');
    doc.setFillColor(16, 185, 129); doc.roundedRect(barX, compBarY, Math.max(2, (barW * (storm_current / maxStormComp))), 3.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(16, 120, 60);
    doc.text(`Stand: ${storm_current.toFixed(0)} L`, barX + barW + 2, compBarY + 2.8);

    compBarY += 4.5;
    doc.setFillColor(235, 240, 245); doc.roundedRect(barX, compBarY, barW, 3.5, 1, 1, 'F');
    doc.setFillColor(100, 116, 139); doc.roundedRect(barX, compBarY, Math.max(2, (barW * (storm_benchmark / maxStormComp))), 3.5, 1, 1, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text(`Urban Avg: ${storm_benchmark.toFixed(0)} L`, barX + barW + 2, compBarY + 2.8);

    // Summary Footer inside Card
    compBarY += 6.5;
    doc.setDrawColor(210, 230, 215); doc.line(20, compBarY, 190, compBarY);
    compBarY += 3.5;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(80, 110, 90);
    doc.text(`Analytical Summary: Active stand asset exhibits ~${((storm_current / (storm_benchmark || 1)) * 100).toFixed(0)}% hydrological efficiency compared to standard regional municipal canopy benchmarks.`, 20, compBarY);
    
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
          
          {/* Tile 1: Live Location & Geolocation Precision */}
          <div className="lg:col-span-4 bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-white/20 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  GPS Satellite Precision
                </span>
                <button
                  onClick={handleManualSync}
                  disabled={loadingLive}
                  className="p-1.5 rounded-lg bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer text-white/60 hover:text-white disabled:opacity-50"
                  title="Acquire live GPS signal"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-950/80 text-emerald-400 rounded-xl border border-emerald-500/10 shadow-inner mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs text-white/50 font-medium">Target Site Location</h3>
                      <span className="text-[9px] font-mono text-emerald-400/90 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {liveLocationDetail.source}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white/90 leading-tight mt-0.5 line-clamp-2">
                      {loadingLive ? 'Acquiring Satellite Fix...' : liveLocationName || 'Coordinates Synced'}
                    </p>
                  </div>
                </div>

                {liveLocation ? (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5">
                        <span className="text-[9px] text-white/40 block mb-0.5">LATITUDE</span>
                        <span className="text-xs font-bold text-white/90">{liveLocation.lat.toFixed(6)}° N</span>
                      </div>
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5">
                        <span className="text-[9px] text-white/40 block mb-0.5">LONGITUDE</span>
                        <span className="text-xs font-bold text-white/90">{liveLocation.lon.toFixed(6)}° E</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5 flex items-center justify-between">
                        <span className="text-white/40">Elevation:</span>
                        <span className="text-white/80 font-bold">{weatherData?.elevation ?? 640} m ASL</span>
                      </div>
                      <div className="bg-white/[0.02] rounded-xl p-2 border border-white/5 flex items-center justify-between">
                        <span className="text-white/40">Accuracy:</span>
                        <span className="text-emerald-400 font-bold">±{liveAccuracy ? liveAccuracy.toFixed(1) : '4.5'} m</span>
                      </div>
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

                {/* Search Address or Coordinates */}
                <form onSubmit={handleSearchLocation} className="mt-3 pt-2 flex gap-1.5 border-t border-white/5">
                  <input
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder="Search city, district, or address..."
                    className="flex-1 min-w-0 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all font-sans"
                  />
                  <button
                    type="submit"
                    disabled={loadingLive || !locationSearchQuery.trim()}
                    className="px-3 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-xl transition-all cursor-pointer font-medium hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    Locate
                  </button>
                </form>
              </div>
            </div>

            {liveLocation && (
              <div className="text-[9px] font-mono text-emerald-400/90 bg-emerald-950/40 border border-emerald-500/15 rounded-lg p-2 mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Telemetry Subsystem Active
                </span>
                <span className="text-white/40">
                  {mounted && weatherData?.lastSyncedIso ? new Date(weatherData.lastSyncedIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Synced'}
                </span>
              </div>
            )}
          </div>

          {/* Tile 2: Live Weather & Air Quality Atmospheric Array */}
          <div className="lg:col-span-8 bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-white/20 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-500/20 flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5" />
                  Atmospheric & Air Quality Telemetry
                </span>
                <div className="flex items-center gap-2">
                  {isSynced && (
                    <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950 border border-emerald-500/20 px-2 py-0.5 rounded">
                      ✓ Aerodynamic Resistance Synced
                    </span>
                  )}
                  <button
                    onClick={handleManualSync}
                    disabled={loadingLive}
                    className="p-1.5 rounded-lg bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer text-white/60 hover:text-white disabled:opacity-50"
                    title="Re-sync Open-Meteo Telemetry"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingLive && !weatherData ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
                  <p className="text-xs text-white/50">Pulling Open-Meteo High-Resolution Atmospheric & AQI Telemetry...</p>
                </div>
              ) : weatherData ? (
                <div className="space-y-4">
                  
                  {/* AQI Summary Banner */}
                  {(() => {
                    const pm25Val = weatherData?.pm25 ?? 42.0;
                    const aqiCat = getAQICategory(pm25Val);
                    return (
                      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${aqiCat.bgClass} ${aqiCat.borderClass}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg font-mono font-black text-lg border ${aqiCat.colorClass} bg-black/40 border-white/10`}>
                            AQI {weatherData?.usAqi ?? 117}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${aqiCat.colorClass}`}>{aqiCat.label}</span>
                              <span className="text-[10px] font-mono text-white/50 bg-black/30 px-1.5 py-0.5 rounded">US EPA Standard</span>
                            </div>
                            <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                              {aqiCat.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right sm:text-right text-[10px] text-white/40 font-mono">
                          Air Density ($\rho$): <strong className="text-emerald-400 font-bold">{metrics.airDensity.toFixed(3)} kg/m³</strong>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Atmospheric Sensor Array Grid */}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-2 flex items-center gap-1.5">
                      <Gauge className="w-3 h-3 text-teal-400" />
                      Atmospheric Microclimate Conditions
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {/* Temp */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-orange-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Temp</span>
                          <Thermometer className="w-3.5 h-3.5" />
                        </div>
                        <div className="mt-1.5">
                          <div className="text-sm font-bold text-white font-mono">{weatherData?.temp ?? 24.5}°C</div>
                          <span className="text-[9px] text-white/40">Apparent {weatherData?.apparentTemp ?? weatherData?.temp ?? 25.1}°C</span>
                        </div>
                      </div>

                      {/* Humidity */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-sky-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Humidity</span>
                          <Droplets className="w-3.5 h-3.5" />
                        </div>
                        <div className="mt-1.5">
                          <div className="text-sm font-bold text-white font-mono">{weatherData?.humidity ?? 62}%</div>
                          <span className="text-[9px] text-white/40">Dew {weatherData?.dewPoint ?? 16.8}°C</span>
                        </div>
                      </div>

                      {/* Pressure */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-emerald-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Pressure</span>
                          <Gauge className="w-3.5 h-3.5" />
                        </div>
                        <div className="mt-1.5">
                          <div className="text-sm font-bold text-white font-mono">{weatherData?.pressure ?? 938.5} <span className="text-[9px] font-normal text-white/40">hPa</span></div>
                          <span className="text-[9px] text-white/40">{weatherData?.elevation ?? 640} m ASL</span>
                        </div>
                      </div>

                      {/* Wind Speed */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-teal-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Wind Speed</span>
                          <Wind className="w-3.5 h-3.5" />
                        </div>
                        <div className="mt-1.5">
                          <div className="text-sm font-bold text-white font-mono">{weatherData?.windSpeed ?? 2.8} <span className="text-[9px] font-normal text-white/40">m/s</span></div>
                          <span className="text-[9px] text-white/40">Gusts {weatherData?.windGusts ?? 4.2} m/s</span>
                        </div>
                      </div>

                      {/* Wind Heading */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-indigo-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Heading</span>
                          <Compass className="w-3.5 h-3.5" />
                        </div>
                        <div className="mt-1.5">
                          <div className="text-sm font-bold text-white font-mono">{weatherData?.windDir ?? 120}° <span className="text-xs text-indigo-400 font-semibold">{getCompassDirection(weatherData?.windDir ?? 120)}</span></div>
                          <span className="text-[9px] text-white/40">Direction</span>
                        </div>
                      </div>

                      {/* Cloud Cover */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-amber-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Cloud Cover</span>
                          <CloudSun className="w-3.5 h-3.5" />
                        </div>
                        <div className="mt-1.5">
                          <div className="text-sm font-bold text-white font-mono">{weatherData?.cloudCover ?? 18}%</div>
                          <span className="text-[9px] text-white/40">Cover</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Pollutant Deposition Array */}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-2 flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-rose-400" />
                      Ambient Pollutant Concentrations & Canopy Deposition
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {/* PM2.5 */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-rose-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">PM2.5</span>
                          <Activity className="w-3 h-3" />
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-bold text-rose-400 font-mono">{(weatherData?.pm25 ?? 42.0).toFixed(1)} <span className="text-[9px] text-white/30 font-normal">µg/m³</span></div>
                          <span className="text-[9px] text-emerald-400 block font-mono">{(metrics.pm25Intercepted * 1000).toFixed(1)} mg/h cap</span>
                        </div>
                      </div>

                      {/* PM10 */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-amber-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">PM10</span>
                          <Activity className="w-3 h-3" />
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-bold text-amber-300 font-mono">{(weatherData?.pm10 ?? 68.4).toFixed(1)} <span className="text-[9px] text-white/30 font-normal">µg/m³</span></div>
                          <span className="text-[9px] text-emerald-400 block font-mono">{(metrics.pm10Intercepted * 1000).toFixed(1)} mg/h cap</span>
                        </div>
                      </div>

                      {/* NO2 */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-purple-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">NO₂</span>
                          <Activity className="w-3 h-3" />
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-bold text-purple-300 font-mono">{(weatherData?.no2 ?? 24.5).toFixed(1)} <span className="text-[9px] text-white/30 font-normal">µg/m³</span></div>
                          <span className="text-[9px] text-purple-400/80 block">Nitrogen Dioxide</span>
                        </div>
                      </div>

                      {/* SO2 */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-yellow-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">SO₂</span>
                          <Activity className="w-3 h-3" />
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-bold text-yellow-300 font-mono">{(weatherData?.so2 ?? 8.2).toFixed(1)} <span className="text-[9px] text-white/30 font-normal">µg/m³</span></div>
                          <span className="text-[9px] text-yellow-400/80 block">Sulfur Dioxide</span>
                        </div>
                      </div>

                      {/* CO */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-blue-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">CO</span>
                          <Activity className="w-3 h-3" />
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-bold text-blue-300 font-mono">{(weatherData?.co ?? 280).toFixed(0)} <span className="text-[9px] text-white/30 font-normal">µg/m³</span></div>
                          <span className="text-[9px] text-blue-400/80 block">Carbon Monoxide</span>
                        </div>
                      </div>

                      {/* Ozone */}
                      <div className="bg-white/[0.02] rounded-xl p-2.5 border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center justify-between text-indigo-400">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40">Ozone O₃</span>
                          <Activity className="w-3 h-3" />
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-bold text-indigo-300 font-mono">{(weatherData?.ozone ?? 34.2).toFixed(1)} <span className="text-[9px] text-white/30 font-normal">µg/m³</span></div>
                          <span className="text-[9px] text-indigo-400/80 block">Ground Ozone</span>
                        </div>
                      </div>
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
              <p className="text-[10px] text-white/40 mt-3 leading-normal flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-400 inline shrink-0 mt-0.5" />
                <span>
                  Aerodynamic flux calculation uses Ideal Gas Law dry air density (<strong className="text-white/80">{metrics.airDensity.toFixed(3)} kg/m³</strong> at {weatherData?.temp ?? 24.5}°C, {weatherData?.pressure ?? 938.5} hPa) and resistance equation $V_d = (R_a + R_b + R_c)^{-1}$ to continuously compute particulate deposition.
                </span>
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
                <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-3 space-y-2.5 shadow-sm transition-all hover:border-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${
                        seasonalMode === 'summer' 
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      }`}>
                        {seasonalMode === 'summer' ? <CloudSun className="w-4 h-4" /> : <Snowflake className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white/90 block">Seasonal Engine</span>
                        <span className="text-[10px] text-white/40 block">
                          {seasonalMode === 'summer' ? 'Peak Leaf Area Index' : 'Winter Leaf Attenuation'}
                        </span>
                      </div>
                    </div>

                    <div className="flex bg-white/[0.04] p-1 rounded-lg border border-white/10 gap-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setSeasonalMode('summer')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          seasonalMode === 'summer'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                            : 'text-white/40 hover:text-white/80 border border-transparent hover:bg-white/[0.02]'
                        }`}
                      >
                        <CloudSun className="w-3 h-3" />
                        Summer
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeasonalMode('winter')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          seasonalMode === 'winter'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                            : 'text-white/40 hover:text-white/80 border border-transparent hover:bg-white/[0.02]'
                        }`}
                      >
                        <Snowflake className="w-3 h-3" />
                        Winter
                      </button>
                    </div>
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
                    type="button"
                    onClick={handleLogTree}
                    className={`w-full relative group overflow-hidden flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg cursor-pointer active:scale-[0.98] ${
                      addedSuccess
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-white shadow-emerald-500/30 border border-emerald-300/60'
                        : 'bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-emerald-700/90 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white border border-emerald-400/30 hover:border-emerald-400/60 shadow-emerald-950/80 hover:shadow-emerald-500/25'
                    }`}
                  >
                    {/* Subtle shine sweep effect on hover */}
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                    <AnimatePresence mode="wait">
                      {addedSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2 font-semibold text-white"
                        >
                          <CheckCircle className="w-4.5 h-4.5 text-white" />
                          <span>Added Successfully</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="normal"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-center gap-2 font-semibold tracking-wide text-white"
                        >
                          <span>Log Tree Asset to Field Report</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>

              </div>
            </div>
          </section>

          {/* Right Panel: Metrics Dashboard & Scientific Visualizer */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Real-time Dynamic CAD/GIS Sandbox */}
            <div className="bg-white/[0.04] backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/20 p-6 overflow-hidden relative">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Interactive Morphology Preview
                  </h2>
                  <p className="text-[11px] text-white/50 mt-0.5">Real-time vector render of active botanical canopy and trunk growth</p>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 backdrop-blur border border-emerald-500/20 px-3 py-1 rounded-lg text-[10px] font-mono text-emerald-300 shadow-sm">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Live CAD Canopy Engine
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* SVG Live Vector Render Box */}
                <div className="lg:col-span-7 bg-gradient-to-b from-slate-900/80 via-slate-950/80 to-slate-950 rounded-2xl p-4 border border-white/10 aspect-[16/10] relative flex items-center justify-center overflow-hidden shadow-inner group">
                  
                  {/* Subtle Background Grid Lines for CAD aesthetic */}
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

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

                  {/* Interactive Tree Render - Proportionally Bounded */}
                  {(() => {
                    // Safe geometry bounds calculation
                    const crownRadiusX = Math.min(140, Math.max(30, canopyDiameter * 5.2));
                    const crownRadiusY = Math.min(75, Math.max(25, canopyDiameter * 3.6));
                    const crownCenterY = 120;
                    const groundY = 210;
                    const trunkWidth = Math.min(26, Math.max(6, dbh * 0.18));
                    const trunkTopY = Math.min(145, crownCenterY + crownRadiusY * 0.35);

                    return (
                      <svg viewBox="0 0 400 250" className="w-full h-full max-h-[225px] relative z-10">
                        <defs>
                          <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#2a1b14" />
                            <stop offset="35%" stopColor="#4a3325" />
                            <stop offset="70%" stopColor="#5c4130" />
                            <stop offset="100%" stopColor="#21150f" />
                          </linearGradient>

                          <radialGradient id="canopyMainGrad" cx="40%" cy="35%" r="65%">
                            <stop offset="0%" stopColor={
                              seasonalMode === 'winter' && activeSpecies.type === 'Broadleaf'
                                ? '#8a654e'
                                : activeSpecies.foliageColor
                            } />
                            <stop offset="70%" stopColor={
                              seasonalMode === 'winter' && activeSpecies.type === 'Broadleaf'
                                ? '#5a4132'
                                : '#10522c'
                            } />
                            <stop offset="100%" stopColor={
                              seasonalMode === 'winter' && activeSpecies.type === 'Broadleaf'
                                ? '#3b281d'
                                : '#072b17'
                            } />
                          </radialGradient>

                          <radialGradient id="canopyHighlightGrad" cx="30%" cy="30%" r="50%">
                            <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </radialGradient>

                          <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#000000" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                          </radialGradient>
                        </defs>

                        {/* Ground Shadow */}
                        <ellipse 
                          cx="200" 
                          cy={groundY + 2} 
                          rx={Math.max(40, crownRadiusX * 0.9)} 
                          ry="8" 
                          fill="url(#groundShadow)" 
                        />

                        {/* Ground line */}
                        <line x1="20" y1={groundY} x2="380" y2={groundY} stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />

                        {/* Flared Trunk rendering scaled with DBH */}
                        <path 
                          d={`
                            M ${200 - trunkWidth / 2},${trunkTopY} 
                            L ${200 - trunkWidth / 2 - 2},${groundY - 8} 
                            Q ${200 - trunkWidth / 2 - 6},${groundY} ${200 - trunkWidth / 2 - 10},${groundY}
                            L ${200 + trunkWidth / 2 + 10},${groundY}
                            Q ${200 + trunkWidth / 2 + 6},${groundY} ${200 + trunkWidth / 2 + 2},${groundY - 8}
                            L ${200 + trunkWidth / 2},${trunkTopY}
                            Z
                          `}
                          fill="url(#trunkGrad)"
                          stroke="#1a110c"
                          strokeWidth="0.8"
                        />

                        {/* Internal Branch Structure - Bounded Strictly Inside Crown Envelope */}
                        {activeSpecies.type === 'Conifer' ? (
                          <>
                            {/* Conifer Central Leader Trunk & Branch Tiers */}
                            <line x1="200" y1={groundY} x2="200" y2={crownCenterY - crownRadiusY * 0.8} stroke="#3b271b" strokeWidth={Math.max(2, trunkWidth * 0.6)} />
                            {[0.3, 0.5, 0.7].map((tierRatio, idx) => {
                              const tierY = crownCenterY + crownRadiusY * (0.5 - tierRatio);
                              const tierWidth = crownRadiusX * (1 - tierRatio * 0.6) * 0.75;
                              return (
                                <g key={idx}>
                                  <path d={`M 200,${tierY} L ${200 - tierWidth},${tierY + 8}`} stroke="#3b271b" strokeWidth={Math.max(1.2, trunkWidth * 0.35)} strokeLinecap="round" />
                                  <path d={`M 200,${tierY} L ${200 + tierWidth},${tierY + 8}`} stroke="#3b271b" strokeWidth={Math.max(1.2, trunkWidth * 0.35)} strokeLinecap="round" />
                                </g>
                              );
                            })}
                          </>
                        ) : (
                          <>
                            {/* Broadleaf Curved Main Limbs */}
                            <path 
                              d={`M 200,${trunkTopY} Q ${200 - crownRadiusX * 0.35},${crownCenterY + crownRadiusY * 0.1} ${200 - crownRadiusX * 0.55},${crownCenterY - crownRadiusY * 0.1}`} 
                              stroke="#3b271b" 
                              strokeWidth={Math.max(1.5, trunkWidth * 0.45)} 
                              fill="none" 
                              strokeLinecap="round"
                            />
                            <path 
                              d={`M 200,${trunkTopY} Q ${200 + crownRadiusX * 0.35},${crownCenterY + crownRadiusY * 0.1} ${200 + crownRadiusX * 0.55},${crownCenterY - crownRadiusY * 0.1}`} 
                              stroke="#3b271b" 
                              strokeWidth={Math.max(1.5, trunkWidth * 0.45)} 
                              fill="none" 
                              strokeLinecap="round"
                            />
                            <path 
                              d={`M 200,${trunkTopY} Q ${200 - crownRadiusX * 0.15},${crownCenterY - crownRadiusY * 0.2} ${200 - crownRadiusX * 0.25},${crownCenterY - crownRadiusY * 0.5}`} 
                              stroke="#3b271b" 
                              strokeWidth={Math.max(1.2, trunkWidth * 0.35)} 
                              fill="none" 
                              strokeLinecap="round"
                            />
                            <path 
                              d={`M 200,${trunkTopY} Q ${200 + crownRadiusX * 0.15},${crownCenterY - crownRadiusY * 0.2} ${200 + crownRadiusX * 0.25},${crownCenterY - crownRadiusY * 0.5}`} 
                              stroke="#3b271b" 
                              strokeWidth={Math.max(1.2, trunkWidth * 0.35)} 
                              fill="none" 
                              strokeLinecap="round"
                            />
                          </>
                        )}

                        {/* Crown Foliage Render */}
                        {activeSpecies.type === 'Conifer' ? (
                          // Organic Multi-Tiered Evergreen Conifer Crown
                          <g opacity={seasonalMode === 'winter' ? '0.9' : '0.96'}>
                            {[
                              { apexR: -1.25, baseR: -0.45, wR: 0.38 },
                              { apexR: -0.85, baseR: -0.1,  wR: 0.58 },
                              { apexR: -0.45, baseR: 0.25,  wR: 0.76 },
                              { apexR: -0.1,  baseR: 0.55,  wR: 0.90 },
                              { apexR: 0.2,   baseR: 0.85,  wR: 1.05 },
                            ].map((tier, idx) => {
                              const apexY = crownCenterY + crownRadiusY * tier.apexR;
                              const baseY = crownCenterY + crownRadiusY * tier.baseR;
                              const w = crownRadiusX * tier.wR;
                              const h = baseY - apexY;

                              return (
                                <g key={idx}>
                                  {/* Main Bough Shadow / Base */}
                                  <path
                                    d={`
                                      M 200,${apexY}
                                      Q ${200 - w * 0.45},${apexY + h * 0.35} ${200 - w},${baseY}
                                      C ${200 - w * 0.65},${baseY + 5} ${200 - w * 0.35},${baseY - 4} 200,${baseY + 2}
                                      C ${200 + w * 0.35},${baseY - 4} ${200 + w * 0.65},${baseY + 5} ${200 + w},${baseY}
                                      Q ${200 + w * 0.45},${apexY + h * 0.35} 200,${apexY}
                                      Z
                                    `}
                                    fill="url(#canopyMainGrad)"
                                    stroke={seasonalMode === 'winter' ? '#4a3525' : '#0a3a20'}
                                    strokeWidth="1.2"
                                    strokeLinejoin="round"
                                  />

                                  {/* Soft Sunlight Highlight on Left Bough Curve */}
                                  {seasonalMode !== 'winter' && (
                                    <path
                                      d={`
                                        M 200,${apexY + h * 0.1}
                                        Q ${200 - w * 0.35},${apexY + h * 0.4} ${200 - w * 0.75},${baseY - 3}
                                        C ${200 - w * 0.5},${baseY - 1} ${200 - w * 0.2},${baseY - 5} 200,${baseY - 2}
                                        Z
                                      `}
                                      fill="url(#canopyHighlightGrad)"
                                      opacity="0.6"
                                    />
                                  )}

                                  {/* Winter Snow Frosting Cap on Top Edge of Bough Tier */}
                                  {seasonalMode === 'winter' && (
                                    <path
                                      d={`
                                        M 200,${apexY - 1}
                                        Q ${200 - w * 0.45},${apexY + h * 0.35} ${200 - w * 0.85},${baseY - 4}
                                        Q ${200 - w * 0.45},${apexY + h * 0.45} 200,${apexY + 4}
                                        Q ${200 + w * 0.45},${apexY + h * 0.45} ${200 + w * 0.85},${baseY - 4}
                                        Q ${200 + w * 0.45},${apexY + h * 0.35} 200,${apexY - 1}
                                        Z
                                      `}
                                      fill="#e2e8f0"
                                      opacity="0.85"
                                    />
                                  )}
                                </g>
                              );
                            })}
                          </g>
                        ) : (
                          // Broadleaf Multi-Lobe Organic Canopy
                          <g opacity={seasonalMode === 'winter' ? '0.22' : '0.92'}>
                            {/* Main Background Mass */}
                            <ellipse 
                              cx="200" 
                              cy={crownCenterY} 
                              rx={crownRadiusX} 
                              ry={crownRadiusY} 
                              fill="url(#canopyMainGrad)" 
                              stroke={seasonalMode === 'winter' ? '#5a4132' : '#08331d'}
                              strokeWidth="1.2"
                            />
                            
                            {/* Soft Organic Sub-Lobes for Realistic Texture */}
                            {seasonalMode !== 'winter' && (
                              <>
                                <ellipse cx={200 - crownRadiusX * 0.4} cy={crownCenterY - crownRadiusY * 0.2} rx={crownRadiusX * 0.55} ry={crownRadiusY * 0.6} fill="url(#canopyMainGrad)" />
                                <ellipse cx={200 + crownRadiusX * 0.4} cy={crownCenterY - crownRadiusY * 0.2} rx={crownRadiusX * 0.55} ry={crownRadiusY * 0.6} fill="url(#canopyMainGrad)" />
                                <ellipse cx="200" cy={crownCenterY - crownRadiusY * 0.35} rx={crownRadiusX * 0.5} ry={crownRadiusY * 0.55} fill="url(#canopyHighlightGrad)" />
                              </>
                            )}
                          </g>
                        )}

                        {/* Botanical Density Spots (LAI representation) */}
                        {[...Array(Math.max(2, Math.min(10, Math.floor(metrics.activeLai * 1.4))))].map((_, index) => {
                          const rx = 200 + Math.sin(index * 1.9) * (crownRadiusX * 0.65);
                          const ry = crownCenterY + Math.cos(index * 2.3) * (crownRadiusY * 0.55);
                          return (
                            <circle 
                              key={index} 
                              cx={rx} 
                              cy={ry} 
                              r={activeSpecies.type === 'Conifer' ? 5 : 7} 
                              fill={seasonalMode === 'winter' ? '#6b4c38' : '#34d399'} 
                              opacity={seasonalMode === 'winter' ? '0.25' : '0.25'} 
                            />
                          );
                        })}

                        {/* Annotations Layer */}
                        {/* DBH Marker Callout */}
                        <g>
                          <line x1={200 - trunkWidth / 2} y1={groundY + 14} x2={200 + trunkWidth / 2} y2={groundY + 14} stroke="#10b981" strokeWidth="1" />
                          <line x1={200 - trunkWidth / 2} y1={groundY + 10} x2={200 - trunkWidth / 2} y2={groundY + 18} stroke="#10b981" strokeWidth="1" />
                          <line x1={200 + trunkWidth / 2} y1={groundY + 10} x2={200 + trunkWidth / 2} y2={groundY + 18} stroke="#10b981" strokeWidth="1" />
                          <text x="200" y={groundY + 28} fill="#10b981" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                            DBH: {dbh.toFixed(1)} cm
                          </text>
                        </g>

                        {/* Canopy Diameter Callout Marker */}
                        <g>
                          <line x1={200 - crownRadiusX} y1={crownCenterY - crownRadiusY - 10} x2={200 + crownRadiusX} y2={crownCenterY - crownRadiusY - 10} stroke="#38bdf8" strokeWidth="1" />
                          <line x1={200 - crownRadiusX} y1={crownCenterY - crownRadiusY - 14} x2={200 - crownRadiusX} y2={crownCenterY - crownRadiusY - 6} stroke="#38bdf8" strokeWidth="1" />
                          <line x1={200 + crownRadiusX} y1={crownCenterY - crownRadiusY - 14} x2={200 + crownRadiusX} y2={crownCenterY - crownRadiusY - 6} stroke="#38bdf8" strokeWidth="1" />
                          
                          {/* Vertical guide lines */}
                          <line x1={200 - crownRadiusX} y1={crownCenterY - crownRadiusY - 6} x2={200 - crownRadiusX} y2={crownCenterY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
                          <line x1={200 + crownRadiusX} y1={crownCenterY - crownRadiusY - 6} x2={200 + crownRadiusX} y2={crownCenterY} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
                          
                          <text x="200" y={crownCenterY - crownRadiusY - 16} fill="#38bdf8" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                            Canopy: {canopyDiameter.toFixed(1)} m
                          </text>
                        </g>
                      </svg>
                    );
                  })()}
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
                          i-Tree Resistance-Based PM2.5 Deposition Model (Zhang et al. 2001)
                        </h4>
                        <button onClick={() => setInspectingMetric(null)} className="text-xs text-white/40 hover:text-white/80 cursor-pointer">Close</button>
                      </div>
                      <div className="text-xs text-white/70 space-y-3 font-mono leading-relaxed">
                        <div>
                          <span className="text-white/40 block">Step 1: Aerodynamic Resistance (Ra)</span>
                          <span className="text-white/60">Formula:</span> Ra = [ln(zr / z0)]² / (k² * Wind_Speed)  [zr=10m, k=0.4, z0={metrics.pm25Details.z0}m]<br/>
                          <span className="text-white/60">Substitution:</span> Ra = [ln(10 / {metrics.pm25Details.z0})]² / (0.16 * {windSpeed.toFixed(1)})<br/>
                          <span className="text-sky-400 font-semibold">Output (s/m):</span> Ra = <span className="text-white">{metrics.pm25Details.Ra.toFixed(2)} s/m</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Step 2: Quasi-Laminar Boundary Layer Resistance (Rb)</span>
                          <span className="text-white/60">Value:</span> Rb = {metrics.pm25Details.Rb} s/m ({activeSpecies.type.toLowerCase().includes('conifer') ? 'Conifer fine needle geometry' : 'Broadleaf surface boundary'})
                        </div>
                        <div>
                          <span className="text-white/40 block">Step 3: Canopy Surface Resistance (Rc)</span>
                          <span className="text-white/60">Formula:</span> Rc = Rc_base / (LAI / LAI_ref)  [Rc_base={metrics.pm25Details.RcBase} s/m, LAI_ref=5.0]<br/>
                          <span className="text-white/60">Substitution:</span> Rc = {metrics.pm25Details.RcBase} / ({metrics.activeLai.toFixed(1)} / 5.0)<br/>
                          <span className="text-sky-400 font-semibold">Output (s/m):</span> Rc = <span className="text-white">{metrics.pm25Details.Rc.toFixed(2)} s/m</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Step 4: Total Resistance & Deposition Velocity (Vd)</span>
                          <span className="text-white/60">Total Resistance:</span> Rtotal = Ra + Rb + Rc = {metrics.pm25Details.Ra.toFixed(2)} + {metrics.pm25Details.Rb} + {metrics.pm25Details.Rc.toFixed(2)} = <span className="text-white">{metrics.pm25Details.Rtotal.toFixed(2)} s/m</span><br/>
                          <span className="text-white/60">Deposition Velocity:</span> Vd = 1 / Rtotal = <span className="text-white">{metrics.pm25Details.vdMPS.toFixed(6)} m/s</span><br/>
                          <span className="text-white/60">Convert to m/hr:</span> Vd_hourly = {metrics.pm25Details.vdMPS.toFixed(6)} * 3600 = <span className="text-white">{metrics.pm25Details.vdPerHour.toFixed(2)} m/hr</span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Step 5: Compute Total Hourly Intercepted PM2.5 Mass Flux (P)</span>
                          <span className="text-white/60">Formula:</span> P = Vd_hourly * C(g/m³) * A(m²) * 1000 mg/hr<br/>
                          <span className="text-white/60">Substitution:</span> P = {metrics.pm25Details.vdPerHour.toFixed(2)} * {(pm25 * 1e-6).toFixed(8)} * {metrics.canopyArea.toFixed(4)} * 1000<br/>
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

                        {/* Dimensions Glass Card */}
                        <div className="grid grid-cols-2 gap-2 bg-white/[0.03] backdrop-blur-md p-2.5 rounded-xl border border-white/10 mb-4 text-center shadow-inner">
                          <div className="flex flex-col items-center justify-center p-1">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400/80 block mb-0.5">Projected DBH</span>
                            <span className="text-xs font-mono font-bold text-white/90">{projection.dbh.toFixed(1)} <span className="text-[10px] text-white/40 font-normal">cm</span></span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-1 border-l border-white/10">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-sky-400/80 block mb-0.5">Projected Canopy</span>
                            <span className="text-xs font-mono font-bold text-white/90">{projection.canopyDiameter.toFixed(1)} <span className="text-[10px] text-white/40 font-normal">m</span></span>
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

                      {/* Interactive Compounding Sequestration Drawer */}
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setExpandedCompoundingYear(expandedCompoundingYear === projection.year ? null : projection.year)}
                          className="w-full flex items-center justify-between text-xs font-medium text-white/80 hover:text-white transition-all p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 cursor-pointer group shadow-sm"
                        >
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400/80 group-hover:text-emerald-400 transition-colors" />
                            <span>Compounding Sequestration</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-white/40 group-hover:text-white/60 font-mono transition-colors">
                              {expandedCompoundingYear === projection.year ? 'Hide' : 'Metrics'}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-transform duration-200 ${expandedCompoundingYear === projection.year ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {expandedCompoundingYear === projection.year && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden mt-3"
                            >
                              <div className="p-3 bg-white/[0.03] backdrop-blur-md rounded-xl border border-white/10 space-y-2.5 text-[11px] shadow-inner">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                  <span className="text-white/50 font-medium uppercase text-[9px] tracking-wider">Net Horizon Growth</span>
                                  <span className="font-mono font-bold text-emerald-400">+{projection.netCo2Gain.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO₂e</span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-white/50">Avg. Annual Rate:</span>
                                  <span className="font-mono text-white/90 font-semibold">~{projection.avgAnnualRate.toFixed(1)} kg/yr</span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-white/50">Vehicle Offset Equiv.:</span>
                                  <span className="font-mono text-white/90 font-semibold">~{projection.carMilesEquivalent.toLocaleString(undefined, { maximumFractionDigits: 0 })} miles</span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-white/50">Mature Tree-Years:</span>
                                  <span className="font-mono text-white/90 font-semibold">~{projection.matureTreeYearsEquiv.toFixed(1)} years</span>
                                </div>

                                <div className="pt-2 border-t border-white/10 text-[9px] text-white/40 leading-relaxed font-sans">
                                  * Allometric carbon storage compounds exponentially with diameter: M = a &middot; DBH<sup>b</sup>.
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Recharts LineChart Visualizer for Cumulative Sequestration Trajectory */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shadow-lg shadow-emerald-500/5">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                        50-Year Cumulative Carbon Sequestration Trajectory
                      </h3>
                      <p className="text-xs text-white/60 mt-0.5 font-sans">
                        Interactive allometric growth curve plotting projected carbon mass across 10, 20, and 50-year horizons
                      </p>
                    </div>
                  </div>

                  {/* Metric Switcher */}
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10 self-stretch sm:self-auto justify-center">
                    <button
                      type="button"
                      onClick={() => setTrajectoryChartMetric('co2e')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        trajectoryChartMetric === 'co2e'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/10'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${trajectoryChartMetric === 'co2e' ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                      Total CO₂e Stored
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrajectoryChartMetric('netGain')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        trajectoryChartMetric === 'netGain'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shadow-sm shadow-emerald-500/10'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${trajectoryChartMetric === 'netGain' ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                      Net Gain (+kg)
                    </button>
                  </div>
                </div>

                {/* Chart Box */}
                <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-emerald-500/20 rounded-2xl p-4 sm:p-6 shadow-2xl transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthTrajectoryData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="carbonGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                            <stop offset="60%" stopColor="#10b981" stopOpacity={0.08} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.00} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
                        <XAxis 
                          dataKey="yearLabel" 
                          stroke="rgba(255, 255, 255, 0.3)" 
                          fontSize={11} 
                          fontFamily="monospace"
                          tickLine={false} 
                          axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }} 
                          dy={6}
                        />
                        <YAxis 
                          stroke="rgba(255, 255, 255, 0.3)" 
                          fontSize={11} 
                          fontFamily="monospace"
                          tickLine={false} 
                          axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                          tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k kg` : `${val} kg`}
                          dx={-4}
                        />
                        <Tooltip 
                          cursor={{ stroke: 'rgba(52, 211, 153, 0.3)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-xl shadow-2xl text-xs space-y-2.5 min-w-[220px]">
                                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <span className="font-mono font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                      {data.yearLabel}
                                    </span>
                                    <span className="text-[10px] text-white/50 font-mono bg-white/[0.06] px-2 py-0.5 rounded border border-white/10">
                                      Year {new Date().getFullYear() + data.year}
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 font-mono text-[11px]">
                                    <div className="flex justify-between items-center">
                                      <span className="text-white/60">Total CO₂e Stored:</span>
                                      <span className="font-bold text-white font-mono">{data.co2e.toLocaleString()} kg</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-white/60">Net Sequestration:</span>
                                      <span className="font-bold text-emerald-400 font-mono">+{data.netGain.toLocaleString()} kg</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-white/10 text-[10px]">
                                      <span className="text-white/40">Tree Dimensions:</span>
                                      <span className="text-sky-300 font-semibold">{data.dbh} cm DBH &middot; {data.canopy} m Canopy</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={trajectoryChartMetric} 
                          stroke="#34d399" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#carbonGradient)" 
                          dot={(props: { cx?: number; cy?: number; index?: number; payload?: { isMilestone?: boolean } }) => {
                            const { cx, cy, index, payload } = props;
                            if (!cx || !cy) return null;
                            if (payload?.isMilestone) {
                              return (
                                <g key={`dot-${index ?? 0}-${cx}-${cy}`}>
                                  <circle cx={cx} cy={cy} r={6} fill="#022c22" stroke="#34d399" strokeWidth={2} />
                                  <circle cx={cx} cy={cy} r={2.5} fill="#34d399" />
                                </g>
                              );
                            }
                            return <circle key={`dot-small-${index ?? 0}-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#10b981" opacity={0.6} />;
                          }}
                          activeDot={{ r: 7, stroke: '#34d399', strokeWidth: 2.5, fill: '#022c22' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Milestone Horizon Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-white/10">
                    {growthTrajectoryData.filter(d => d.isMilestone).map((m) => {
                      const pctGrowth = metrics.co2e > 0 ? ((m.co2e - metrics.co2e) / metrics.co2e) * 100 : 0;
                      return (
                        <div 
                          key={m.year} 
                          className="bg-white/[0.03] backdrop-blur-md border border-white/10 hover:border-emerald-500/30 transition-all rounded-xl p-3.5 shadow-lg group/card relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-400/90 flex items-center gap-1">
                              {m.year === 0 ? 'Baseline (Present)' : `${m.year} Year Horizon`}
                            </span>
                            {m.year > 0 && (
                              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                +{pctGrowth.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <span className="text-base font-bold font-mono text-white block tracking-tight">
                            {trajectoryChartMetric === 'co2e' ? `${m.co2e.toLocaleString()} kg` : `+${m.netGain.toLocaleString()} kg`}
                          </span>
                          <span className="text-[10px] text-white/50 font-mono mt-1 block">
                            {m.dbh} cm DBH &middot; {m.canopy} m Canopy
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
