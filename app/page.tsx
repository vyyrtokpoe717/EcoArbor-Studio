'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
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
  RefreshCw,
  Eye,
  CheckCircle,
  HelpCircle
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
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>(speciesData[0].id);
  const [dbh, setDbh] = useState<number>(40);
  const [canopyDiameter, setCanopyDiameter] = useState<number>(8);
  const [pm25, setPm25] = useState<number>(60);
  const [windSpeed, setWindSpeed] = useState<number>(3);
  
  // Field Log State
  const [logs, setLogs] = useState<LoggedTree[]>([]);
  const [inspectingMetric, setInspectingMetric] = useState<'carbon' | 'air' | 'hydrology' | null>(null);
  const [chartMetric, setChartMetric] = useState<'carbon' | 'pm25' | 'stormwater'>('carbon');

  const activeSpecies = useMemo(() => speciesData.find(s => s.id === selectedSpeciesId) || speciesData[0], [selectedSpeciesId]);

  // Real scientific equations computed dynamically without placeholders
  const metrics = useMemo(() => {
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
    const pm25Intercepted = F * activeSpecies.lai * canopyArea * 1000;

    // D. Canopy Stormwater Interception (I, Liters)
    // I = Sc * LAI * A
    const stormwater = activeSpecies.sc * activeSpecies.lai * canopyArea;

    return {
      biomass: M,
      carbonContent,
      co2e,
      canopyArea,
      vdMPS,
      vdPerHour,
      flux: F,
      pm25Intercepted,
      stormwater
    };
  }, [activeSpecies, dbh, canopyDiameter, pm25, windSpeed]);

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
  };

  const handleLoadSampleStand = () => {
    const samples: LoggedTree[] = [
      {
        id: 'L-A90F1',
        speciesId: 'sacred-fig',
        speciesName: 'Sacred Fig / Peepal',
        scientificName: 'Ficus religiosa',
        dbh: 95.0,
        canopyDiameter: 18.0,
        canopyArea: Math.PI * Math.pow(9.0, 2),
        co2e: (Math.exp(-2.1550 + 2.4410 * Math.log(95.0)) * 0.50) * (44.01 / 12.011),
        pm25: ((0.0022 + 0.0002 * 3.5) * 3600 * (120 * 1e-6)) * 5.2 * (Math.PI * Math.pow(9.0, 2)) * 1000,
        stormwater: 1.4 * 5.2 * (Math.PI * Math.pow(9.0, 2)),
        timestamp: '12:05 PM'
      },
      {
        id: 'L-D44C2',
        speciesId: 'deodar-cedar',
        speciesName: 'Deodar Cedar',
        scientificName: 'Cedrus deodara',
        dbh: 65.5,
        canopyDiameter: 12.5,
        canopyArea: Math.PI * Math.pow(6.25, 2),
        co2e: (0.0782 * Math.pow(65.5, 2.4180) * 0.50) * (44.01 / 12.011),
        pm25: ((0.0072 + 0.0005 * 4.0) * 3600 * (45 * 1e-6)) * 6.8 * (Math.PI * Math.pow(6.25, 2)) * 1000,
        stormwater: 2.2 * 6.8 * (Math.PI * Math.pow(6.25, 2)),
        timestamp: '12:14 PM'
      },
      {
        id: 'L-T22B8',
        speciesId: 'teak',
        speciesName: 'Teak',
        scientificName: 'Tectona grandis',
        dbh: 32.0,
        canopyDiameter: 7.0,
        canopyArea: Math.PI * Math.pow(3.5, 2),
        co2e: (0.1140 * Math.pow(32.0, 2.3840) * 0.50) * (44.01 / 12.011),
        pm25: ((0.0016 + 0.0002 * 2.5) * 3600 * (75 * 1e-6)) * 4.0 * (Math.PI * Math.pow(3.5, 2)) * 1000,
        stormwater: 1.1 * 4.0 * (Math.PI * Math.pow(3.5, 2)),
        timestamp: '12:18 PM'
      }
    ];
    setLogs(samples);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleDeleteLog = (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-24 selection:bg-emerald-500 selection:text-white">
      
      {/* Top Banner & Title Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
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
        
        {/* Ecological Overview Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-3 p-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xs text-slate-400">Selected Species</div>
              <div className="text-sm font-semibold text-white">{activeSpecies.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 border-t md:border-t-0 md:border-l border-slate-800">
            <Layers className="w-5 h-5 text-sky-400" />
            <div>
              <div className="text-xs text-slate-400">Canopy Surface Area</div>
              <div className="text-sm font-semibold text-white font-mono">{metrics.canopyArea.toFixed(1)} m²</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 border-t md:border-t-0 md:border-l border-slate-800">
            <Droplets className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-xs text-slate-400">Leaf Area Index (LAI)</div>
              <div className="text-sm font-semibold text-white font-mono">{activeSpecies.lai.toFixed(1)} m²/m²</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 border-t md:border-t-0 md:border-l border-slate-800">
            <Wind className="w-5 h-5 text-teal-400" />
            <div>
              <div className="text-xs text-slate-400">Dry Wood Biomass</div>
              <div className="text-sm font-semibold text-white font-mono">{metrics.biomass.toFixed(1)} kg</div>
            </div>
          </div>
        </div>

        {/* Primary Simulation Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Inputs and Parameter Sliders */}
          <section id="parameter-panel" className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <h2 className="text-md font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Activity className="w-4 h-4 text-emerald-400" />
                Arboricultural Inputs
              </h2>

              <div className="space-y-6">
                
                {/* Species Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Tree Species</label>
                    <span className="text-xs font-mono text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">{activeSpecies.type}</span>
                  </div>
                  <select 
                    value={selectedSpeciesId}
                    onChange={(e) => setSelectedSpeciesId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  >
                    {speciesData.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.scientificName})</option>
                    ))}
                  </select>
                </div>

                {/* Trunk DBH */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Trunk DBH</label>
                    <span className="text-xs font-mono font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/30">
                      {dbh.toFixed(1)} cm
                    </span>
                  </div>
                  <input 
                    type="range" min="10" max="150" step="0.5" 
                    value={dbh} onChange={(e) => setDbh(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-colors" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>10 cm (Sapling)</span>
                    <span>150 cm (Giant)</span>
                  </div>
                </div>

                {/* Canopy Diameter */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Canopy Diameter</label>
                    <span className="text-xs font-mono font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/30">
                      {canopyDiameter.toFixed(1)} m
                    </span>
                  </div>
                  <input 
                    type="range" min="2" max="25" step="0.5" 
                    value={canopyDiameter} onChange={(e) => setCanopyDiameter(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-colors" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>2 m</span>
                    <span>25 m</span>
                  </div>
                </div>

                {/* Ambient PM2.5 */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Ambient PM2.5</label>
                    <span className="text-xs font-mono font-semibold text-sky-300 bg-sky-950/80 px-2 py-1 rounded border border-sky-500/30">
                      {pm25} µg/m³
                    </span>
                  </div>
                  <input 
                    type="range" min="5" max="300" step="1" 
                    value={pm25} onChange={(e) => setPm25(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-colors" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>5 µg/m³ (Clean)</span>
                    <span className="text-red-400 font-medium">300 µg/m³ (Severe AQI)</span>
                  </div>
                </div>

                {/* Wind Speed */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Ambient Wind Speed</label>
                    <span className="text-xs font-mono font-semibold text-blue-300 bg-blue-950/80 px-2 py-1 rounded border border-blue-500/30">
                      {windSpeed.toFixed(1)} m/s
                    </span>
                  </div>
                  <input 
                    type="range" min="1" max="12" step="0.5" 
                    value={windSpeed} onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-colors" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1 m/s (Breeze)</span>
                    <span>12 m/s (Gale)</span>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
              <button
                onClick={handleLogTree}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 shrink-0" />
                Log Tree Asset to Field Report
              </button>
              
              <button
                onClick={handleLoadSampleStand}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 font-medium py-3 px-4 rounded-xl transition-all"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                Load Sample Stand
              </button>
            </div>
          </section>

          {/* Right Panel: Metrics Dashboard & Scientific Visualizer */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Real-time Dynamic CAD/GIS Sandbox */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl overflow-hidden relative">
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-400 border border-slate-800">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Live Canopy CAD Simulator
              </div>
              
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Interactive Morphology Preview
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* SVG Live Vector Render */}
                <div className="md:col-span-7 bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 aspect-[16/10] relative flex items-center justify-center overflow-hidden">
                  
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
                        <stop offset="0%" stopColor={activeSpecies.foliageColor} />
                        <stop offset="75%" stopColor={activeSpecies.foliageColor} />
                        <stop offset="100%" stopColor="#082f1b" />
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
                      // Broadleaf lush rounded canopy
                      <ellipse 
                        cx="200" 
                        cy="130" 
                        rx={canopyDiameter * 6.5} 
                        ry={Math.max(30, canopyDiameter * 4.5)} 
                        fill="url(#canopyGrad)" 
                        opacity="0.9"
                        stroke="#0f3d23"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Additional botanical detail patterns to match canopy density (LAI) */}
                    {[...Array(Math.min(12, Math.floor(activeSpecies.lai * 1.5)))].map((_, index) => {
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
                          fill="#10b981" 
                          opacity="0.3" 
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
                <div className="md:col-span-5 space-y-4">
                  <div>
                    <h3 className="text-md font-bold text-white leading-tight">
                      {activeSpecies.name}
                    </h3>
                    <p className="text-xs italic text-emerald-400/90 font-serif">
                      {activeSpecies.scientificName}
                    </p>
                  </div>

                  <div className="text-xs space-y-2 text-slate-300">
                    <div>
                      <span className="font-semibold text-slate-400 block uppercase text-[9px] tracking-wider">Botanical Family</span>
                      <p className="font-mono bg-slate-950 px-2 py-1 rounded text-slate-200 mt-0.5 border border-slate-800 inline-block">{activeSpecies.family}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block uppercase text-[9px] tracking-wider">Ecological Niche</span>
                      <p>{activeSpecies.habitat}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block uppercase text-[9px] tracking-wider">Species Profile</span>
                      <p className="leading-relaxed text-slate-400">{activeSpecies.description}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Metrics Dashboard Output Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Carbon */}
              <div 
                className={`bg-slate-900 rounded-2xl border transition-all cursor-pointer p-6 flex flex-col justify-between group ${
                  inspectingMetric === 'carbon' ? 'border-emerald-400 ring-1 ring-emerald-400/20' : 'border-slate-800 hover:border-slate-700'
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
                  <h3 className="text-sm font-semibold text-slate-200 mt-4">Carbon Sequestration</h3>
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
                    <span className="text-sm text-slate-400 font-medium self-end ml-1">kg</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Click to view equations</span>
                  <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>

              {/* Card 2: Air Quality */}
              <div 
                className={`bg-slate-900 rounded-2xl border transition-all cursor-pointer p-6 flex flex-col justify-between group ${
                  inspectingMetric === 'air' ? 'border-sky-400 ring-1 ring-sky-400/20' : 'border-slate-800 hover:border-slate-700'
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
                  <h3 className="text-sm font-semibold text-slate-200 mt-4">Air Quality Benefit</h3>
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
                    <span className="text-sm text-slate-400 font-medium self-end ml-1">mg/hr</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Click to view equations</span>
                  <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors" />
                </div>
              </div>

              {/* Card 3: Hydrology */}
              <div 
                className={`bg-slate-900 rounded-2xl border transition-all cursor-pointer p-6 flex flex-col justify-between group ${
                  inspectingMetric === 'hydrology' ? 'border-blue-400 ring-1 ring-blue-400/20' : 'border-slate-800 hover:border-slate-700'
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
                  <h3 className="text-sm font-semibold text-slate-200 mt-4">Hydrological Retention</h3>
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
                    <span className="text-sm text-slate-400 font-medium self-end ml-1">Liters</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Click to view equations</span>
                  <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
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
                  className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 overflow-hidden shadow-xl"
                >
                  {inspectingMetric === 'carbon' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          Step-by-Step Carbon Equation Walkthrough
                        </h4>
                        <button onClick={() => setInspectingMetric(null)} className="text-xs text-slate-500 hover:text-slate-300">Close</button>
                      </div>
                      <div className="text-xs text-slate-300 space-y-3 font-mono leading-relaxed">
                        <div>
                          <span className="text-slate-500 block">Step 1: Calculate Aboveground Dry Wood Biomass (M)</span>
                          <span className="text-slate-400">Formula:</span> {activeSpecies.equationType === 'power' ? 'M = a * (DBH ^ b)' : 'M = exp(a + b * ln(DBH))'}<br/>
                          <span className="text-slate-400">Substitution:</span> M = {
                            activeSpecies.equationType === 'power' 
                              ? `${activeSpecies.a} * (${dbh.toFixed(1)} ^ ${activeSpecies.b})`
                              : `exp(${activeSpecies.a} + ${activeSpecies.b} * ln(${dbh.toFixed(1)}))`
                          }<br/>
                          <span className="text-emerald-400 font-semibold">Output:</span> M = <span className="text-white">{metrics.biomass.toFixed(4)} kg</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Step 2: Dry wood Carbon fraction (assume 50% Carbon Content)</span>
                          <span className="text-slate-400">Formula:</span> Carbon Content = M * 0.50<br/>
                          <span className="text-slate-400">Substitution:</span> Carbon = {metrics.biomass.toFixed(4)} * 0.50<br/>
                          <span className="text-emerald-400 font-semibold">Output:</span> Carbon Content = <span className="text-white">{metrics.carbonContent.toFixed(4)} kg C</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Step 3: Convert to Carbon Dioxide Equivalent (CO₂e)</span>
                          <span className="text-slate-400">Formula:</span> CO₂e = Carbon Content * (Molecular weight CO₂ / Carbon) ≈ Carbon Content * 3.667<br/>
                          <span className="text-slate-400">Substitution:</span> CO₂e = {metrics.carbonContent.toFixed(4)} * (44.01 / 12.011)<br/>
                          <span className="text-emerald-400 font-bold">Calculated CO₂e:</span> <span className="text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/20">{metrics.co2e.toFixed(2)} kg</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {inspectingMetric === 'air' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          i-Tree PM2.5 Deposition Mathematical Disclosures
                        </h4>
                        <button onClick={() => setInspectingMetric(null)} className="text-xs text-slate-500 hover:text-slate-300">Close</button>
                      </div>
                      <div className="text-xs text-slate-300 space-y-3 font-mono leading-relaxed">
                        <div>
                          <span className="text-slate-500 block">Step 1: Determine Canopy Ground Area (A)</span>
                          <span className="text-slate-400">Formula:</span> A = π * (Canopy_Diameter / 2)²<br/>
                          <span className="text-slate-400">Substitution:</span> A = 3.14159 * ({canopyDiameter.toFixed(1)} / 2)²<br/>
                          <span className="text-sky-400 font-semibold">Output:</span> A = <span className="text-white">{metrics.canopyArea.toFixed(4)} m²</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Step 2: Compute Wind-Adjusted Deposition Velocity (Vd)</span>
                          <span className="text-slate-400">Formula:</span> {activeSpecies.type === 'Conifer' ? 'Vd = Base_Vd + (0.0005 * Wind)' : 'Vd = Base_Vd + (0.0002 * Wind)'} m/s<br/>
                          <span className="text-slate-400">Substitution:</span> Vd = {activeSpecies.baseVd} + ({activeSpecies.type === 'Conifer' ? '0.0005' : '0.0002'} * {windSpeed.toFixed(1)})<br/>
                          <span className="text-sky-400 font-semibold">Output (m/s):</span> Vd = <span className="text-white">{metrics.vdMPS.toFixed(6)} m/s</span><br/>
                          <span className="text-slate-400">Convert to m/hr:</span> Vd = {metrics.vdMPS.toFixed(6)} * 3600 = <span className="text-white">{metrics.vdPerHour.toFixed(4)} m/hr</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Step 3: Convert Ambient PM2.5 Concentration to g/m³</span>
                          <span className="text-slate-400">Formula:</span> C = Ambient * 1e-6<br/>
                          <span className="text-slate-400">Substitution:</span> C = {pm25} * 0.000001 = <span className="text-white">{(pm25 * 1e-6).toFixed(8)} g/m³</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Step 4: Compute Total Hourly Intercepted Mass (P)</span>
                          <span className="text-slate-400">Formula:</span> P = Vd_hr * C * LAI * A * 1000 mg/hr<br/>
                          <span className="text-slate-400">Substitution:</span> P = {metrics.vdPerHour.toFixed(4)} * {(pm25 * 1e-6).toFixed(8)} * {activeSpecies.lai} * {metrics.canopyArea.toFixed(4)} * 1000<br/>
                          <span className="text-sky-400 font-bold">Calculated Interception:</span> <span className="text-sky-300 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-500/20">{metrics.pm25Intercepted.toFixed(2)} mg/hour</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {inspectingMetric === 'hydrology' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          Ecohydrological Rain Retention Formula Disclosures
                        </h4>
                        <button onClick={() => setInspectingMetric(null)} className="text-xs text-slate-500 hover:text-slate-300">Close</button>
                      </div>
                      <div className="text-xs text-slate-300 space-y-3 font-mono leading-relaxed">
                        <div>
                          <span className="text-slate-500 block">Step 1: Determine Canopy Ground Area (A)</span>
                          <span className="text-slate-400">Formula:</span> A = π * (Canopy_Diameter / 2)² = <span className="text-white">{metrics.canopyArea.toFixed(4)} m²</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Step 2: Apply Leaf Area Index (LAI) and Storage Capacity (Sc)</span>
                          <span className="text-slate-400">Formula:</span> I = Sc * LAI * A<br/>
                          <span className="text-slate-400">Parameters:</span> Sc (Canopy Capacity) = {activeSpecies.sc} mm | LAI = {activeSpecies.lai} m²/m²<br/>
                          <span className="text-slate-500 block leading-relaxed">Note: Canopy capacity (mm) scales with leaf index, representing Liters of water held per square meter of leaf area before reaching the soil.</span>
                          <span className="text-slate-400">Substitution:</span> I = {activeSpecies.sc} * {activeSpecies.lai} * {metrics.canopyArea.toFixed(4)}<br/>
                          <span className="text-blue-400 font-bold">Calculated Water Storage:</span> <span className="text-blue-300 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-500/20">{metrics.stormwater.toFixed(1)} Liters</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Arbor Stand Synthesis Summary (Aggregate Dashboard) */}
        {logs.length > 0 && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-md font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  Logged Arbor Stand Summary
                </h2>
                <p className="text-xs text-slate-400 mt-1">Aggregated ecological impact of your customized forest stand</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
                <span>Active Population:</span>
                <span className="text-emerald-400 font-bold">{standTotals.count} trees</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 flex items-center gap-4">
                <div className="p-2.5 bg-emerald-950/80 rounded-lg text-emerald-400 border border-emerald-500/10">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total CO₂e Sequestered</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {standTotals.co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-slate-400 font-normal">kg</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 flex items-center gap-4">
                <div className="p-2.5 bg-sky-950/80 rounded-lg text-sky-400 border border-sky-500/10">
                  <Wind className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total PM2.5 Intercepted</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {standTotals.pm25.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-slate-400 font-normal">mg/hr</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 flex items-center gap-4">
                <div className="p-2.5 bg-blue-950/80 rounded-lg text-blue-400 border border-blue-500/10">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Stormwater Storage Held</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {standTotals.stormwater.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-slate-400 font-normal">Liters</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Field Log Table */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80">
            <div>
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Arborist Field Report Log
              </h2>
              <p className="text-xs text-slate-400 mt-1">Real-time database of surveyed tree inventory assets</p>
            </div>
            {logs.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 px-4 py-2.5 rounded-lg transition-colors border border-emerald-500/30 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
                <button 
                  onClick={handleClearLogs}
                  className="flex items-center gap-2 text-xs font-semibold text-red-300 bg-red-950/40 hover:bg-red-950/80 px-4 py-2.5 rounded-lg transition-colors border border-red-500/20 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Inventory
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {logs.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/40">
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
                <tbody className="text-xs divide-y divide-slate-800/60 font-mono text-slate-300 bg-slate-900/10">
                  <AnimatePresence initial={false}>
                    {logs.map((log) => (
                      <motion.tr 
                        key={log.id} 
                        layout
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -15, transition: { duration: 0.15 } }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-6 py-4 text-slate-500 font-bold">{log.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-sans font-semibold text-slate-100">{log.speciesName}</div>
                          <div className="text-[10px] text-slate-400 italic font-serif">{log.scientificName}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-200">{log.dbh.toFixed(1)}</td>
                        <td className="px-6 py-4">
                          <div className="text-slate-200">{log.canopyDiameter.toFixed(1)} m</div>
                          <div className="text-[10px] text-slate-400">{log.canopyArea.toFixed(1)} m²</div>
                        </td>
                        <td className="px-6 py-4 text-emerald-400 font-semibold">{log.co2e.toFixed(1)}</td>
                        <td className="px-6 py-4 text-sky-400 font-semibold">{log.pm25.toFixed(1)}</td>
                        <td className="px-6 py-4 text-blue-400 font-semibold">{log.stormwater.toFixed(1)}</td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 hover:bg-red-950/80 rounded-lg text-slate-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20 cursor-pointer"
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
            ) : (
              <div className="py-16 text-center space-y-3 bg-slate-900/20">
                <div className="inline-flex p-3 bg-slate-800/60 text-slate-500 rounded-2xl border border-slate-800">
                  <TreeDeciduous className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">No tree inventory assets logged yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    Set your morphological dimensions in the sidebar, choose a peer-reviewed species dataset, and log your first surveyed asset.
                  </p>
                </div>
                <div className="pt-2">
                  <button 
                    onClick={handleLoadSampleStand}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/20 px-4 py-2.5 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Load Sample Forest Inventory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comparative Benefit Analysis Chart */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-md font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Comparative Benefit Analytics
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                A side-by-side performance evaluation of the current model against logged stand aggregates.
              </p>
            </div>
            {/* Metric select buttons */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
              <button
                onClick={() => setChartMetric('carbon')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  chartMetric === 'carbon'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Carbon Sequestration
              </button>
              <button
                onClick={() => setChartMetric('pm25')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  chartMetric === 'pm25'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Air Quality
              </button>
              <button
                onClick={() => setChartMetric('stormwater')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  chartMetric === 'stormwater'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
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
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Current Model contribution</span>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      {chartMetric === 'carbon' && `${metrics.co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO₂e`}
                      {chartMetric === 'pm25' && `${metrics.pm25Intercepted.toLocaleString(undefined, { maximumFractionDigits: 1 })} mg/hr`}
                      {chartMetric === 'stormwater' && `${metrics.stormwater.toLocaleString(undefined, { maximumFractionDigits: 1 })} Liters`}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Based on current interactive slider configurations ({dbh.toFixed(1)} cm DBH, {canopyDiameter.toFixed(1)} m canopy).
                    </p>
                  </div>

                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Stand Cumulative Total</span>
                    <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                      {chartMetric === 'carbon' && `${standTotals.co2e.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO₂e`}
                      {chartMetric === 'pm25' && `${standTotals.pm25.toLocaleString(undefined, { maximumFractionDigits: 1 })} mg/hr`}
                      {chartMetric === 'stormwater' && `${standTotals.stormwater.toLocaleString(undefined, { maximumFractionDigits: 1 })} Liters`}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Aggregated across the {standTotals.count} currently registered inventory assets.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-slate-500 inline-block mr-1 align-text-bottom" />
                  Compare the relative performance of your single current model against your entire logged collection. Values update instantaneously as parameters change.
                </div>
              </div>

              {/* Recharts chart render */}
              <div className="lg:col-span-8 bg-slate-950/50 rounded-xl p-4 border border-slate-800/80 h-[280px]">
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
                        name: 'Stand Cumulative Total',
                        value: chartMetric === 'carbon' 
                          ? standTotals.co2e 
                          : chartMetric === 'pm25' 
                          ? standTotals.pm25 
                          : standTotals.stormwater,
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
            <div className="h-[280px] bg-slate-950/40 rounded-xl flex items-center justify-center text-slate-500 font-mono text-xs">
              Initializing Analytics Modules...
            </div>
          )}
        </div>

        {/* Methodology & Background Documentation */}
        <section id="methodology" className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
          <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Info className="w-4 h-4 text-emerald-400" />
            Theoretical Framework & Scientific References
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400 leading-relaxed">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[10px]">Allometric Dry Biomass</h4>
              <p>
                Equations utilize power-law relationships established by the Forest Research Institute of India (FRI) and western sylvicultural stations. Species-specific parameters map trunk Diameter at Breast Height (DBH) to aboveground dry weight, with a standard carbon mass fraction assumption of 50%.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[10px]">i-Tree PM2.5 Deposition</h4>
              <p>
                Modeled after the US Forest Service i-Tree Eco methodology. Deposition velocity (Vd) is dynamically adjusted for local wind speed and species-specific leaf morphology. Needle structure in conifers provides greater turbulence, accelerating deposition relative to smoother deciduous surfaces.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[10px]">Ecohydrological Rain Retention</h4>
              <p>
                Stormwater mitigations scale with Canopy Water Storage capacity (Sc) and Leaf Area Index (LAI). Leaf Area Index measures multi-layered canopy density per square meter of ground projection, which dictates the total holding volume of rainfall before stemflow or canopy saturation occurs.
              </p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
