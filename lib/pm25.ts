/**
 * Calculates PM2.5 particle deposition velocity, multi-pollutant interception, and air density adjustments using a multi-layer resistance model.
 * Methodological references:
 * - Zhang, L., Gong, S., Padro, J., & Barrie, L. (2001). A size-segregated particle dry deposition scheme. Atmospheric Environment, 35(3), 549-560.
 * - Nowak, D. J., Greenfield, E. J., Hoehn, R. E., & Lapoint, E. (2013). Carbon storage and sequestration by trees in urban and rural areas of the United States. Environmental Pollution, 178, 229-236.
 * - Nowak, D. J., et al. (2014). Tree and forest effects on air quality and human health in the United States. Environmental Pollution, 193, 119-129.
 */

export function getAQICategory(usAqi: number) {
  if (usAqi <= 50) {
    return {
      label: 'Good',
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/80',
      borderClass: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      description: 'Air quality is satisfactory; air pollution poses little or no risk.',
    };
  } else if (usAqi <= 100) {
    return {
      label: 'Moderate',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-950/80',
      borderClass: 'border-amber-500/30',
      badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      description: 'Air quality is acceptable; moderate health concern for sensitive individuals.',
    };
  } else if (usAqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-950/80',
      borderClass: 'border-orange-500/30',
      badgeBg: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
      description: 'Members of sensitive groups may experience health effects.',
    };
  } else if (usAqi <= 200) {
    return {
      label: 'Unhealthy',
      colorClass: 'text-rose-400',
      bgClass: 'bg-rose-950/80',
      borderClass: 'border-rose-500/30',
      badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      description: 'Everyone may begin to experience health effects.',
    };
  } else if (usAqi <= 300) {
    return {
      label: 'Very Unhealthy',
      colorClass: 'text-purple-400',
      bgClass: 'bg-purple-950/80',
      borderClass: 'border-purple-500/30',
      badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      description: 'Health alert: risk of health effects for the entire population.',
    };
  } else {
    return {
      label: 'Hazardous',
      colorClass: 'text-rose-300 font-black',
      bgClass: 'bg-rose-950',
      borderClass: 'border-rose-600',
      badgeBg: 'bg-rose-950 text-rose-200 border-rose-500',
      description: 'Health warning of emergency conditions; serious risk for all.',
    };
  }
}

export function calculatePM25Deposition({
  windSpeed,
  LAI,
  canopyDiameter,
  ambientPM25,
  speciesLeafType,
  temperature = 25,
  relativeHumidity = 50,
  surfacePressure = 1013.25,
  ambientPM10,
  ambientNO2,
  ambientSO2,
  ambientOzone,
  ambientCO,
}: {
  windSpeed: number;
  LAI: number;
  canopyDiameter: number;
  ambientPM25: number;
  speciesLeafType: string;
  temperature?: number;
  relativeHumidity?: number;
  surfacePressure?: number;
  ambientPM10?: number;
  ambientNO2?: number;
  ambientSO2?: number;
  ambientOzone?: number;
  ambientCO?: number;
}) {
  const isConifer = speciesLeafType.toLowerCase().includes('conifer');

  // Exact atmospheric air density ρ (kg/m³) using Ideal Gas Law adjusted for pressure & temperature
  const tempK = temperature + 273.15;
  const pPa = surfacePressure * 100; // convert hPa to Pa
  const Rspecific = 287.058; // J/(kg·K) for dry air
  const airDensity = pPa / (Rspecific * tempK); // kg/m³

  // Constants - Zhang et al. (2001) / Nowak et al. (2013)
  const k = 0.4; // von Kármán constant
  const zr = 10; // Meteorological reference height (10 m)
  const z0 = isConifer ? 0.15 : 0.08; // Roughness length z0: 0.15 m for conifer, 0.08 m for broadleaf

  const safeWindSpeed = Math.max(windSpeed, 0.1); // Prevent division by zero
  const safeLai = Math.max(LAI, 0.1); // Prevent division by zero

  // Step 1: Aerodynamic resistance Ra (s/m)
  const lnRatio = Math.log(zr / z0);
  const Ra = Math.pow(lnRatio, 2) / (Math.pow(k, 2) * safeWindSpeed);

  // Step 2: Quasi-laminar boundary layer resistance Rb (s/m)
  // Temperature & humidity micro-correction for boundary layer thickness
  const tempCorrection = Math.sqrt(298.15 / tempK);
  const RbBase = isConifer ? 5 : 8;
  const Rb = RbBase * tempCorrection;

  // Step 3: Canopy/surface resistance Rc (s/m)
  const RcBase = isConifer ? 40 : 60;
  const laiReference = 5.0;
  const humidityFactor = relativeHumidity < 30 ? 1.15 : relativeHumidity > 80 ? 0.9 : 1.0;
  const Rc = (RcBase * humidityFactor) / (safeLai / laiReference);

  // Step 4: Total deposition velocity Vd (m/s)
  const Rtotal = Ra + Rb + Rc;
  const vdMPS = 1 / Rtotal; // Deposition velocity in m/s
  const vdPerHour = vdMPS * 3600; // Convert to m/hr

  // Step 5: Final PM2.5 mass flux P (mg/hr)
  const canopyArea = Math.PI * Math.pow(canopyDiameter / 2, 2);
  const cGperM3 = ambientPM25 * 1e-6;
  const flux = vdPerHour * cGperM3; // Deposition flux F = Vd_hr * C (g/m²/hr)
  const pm25Intercepted = vdPerHour * cGperM3 * canopyArea * 1000; // P (mg/hr)

  // Multi-pollutant removal rates (Nowak et al. 2014, i-Tree methodology)
  const pm10Val = ambientPM10 ?? ambientPM25 * 1.6;
  const vdPM10 = vdMPS * 2.2;
  const pm10Intercepted = vdPM10 * 3600 * (pm10Val * 1e-6) * canopyArea * 1000; // mg/hr

  const no2Val = ambientNO2 ?? 20;
  const no2Intercepted = (vdMPS * 0.85) * 3600 * (no2Val * 1e-6) * canopyArea * 1000; // mg/hr

  const so2Val = ambientSO2 ?? 8;
  const so2Intercepted = (vdMPS * 1.1) * 3600 * (so2Val * 1e-6) * canopyArea * 1000; // mg/hr

  const ozoneVal = ambientOzone ?? 35;
  const ozoneIntercepted = (vdMPS * 0.95) * 3600 * (ozoneVal * 1e-6) * canopyArea * 1000; // mg/hr

  const coVal = ambientCO ?? 250;
  const coIntercepted = (vdMPS * 0.05) * 3600 * (coVal * 1e-6) * canopyArea * 1000; // mg/hr

  return {
    Ra,
    Rb,
    Rc,
    RcBase,
    Rtotal,
    z0,
    vdMPS,
    vdPerHour,
    cGperM3,
    canopyArea,
    flux,
    pm25Intercepted,
    airDensity,
    pm10Intercepted,
    no2Intercepted,
    so2Intercepted,
    ozoneIntercepted,
    coIntercepted,
  };
}

