/**
 * Calculates PM2.5 particle deposition velocity and total mass flux using a multi-layer resistance model.
 * Methodological references:
 * - Zhang, L., Gong, S., Padro, J., & Barrie, L. (2001). A size-segregated particle dry deposition scheme. Atmospheric Environment, 35(3), 549-560.
 * - Nowak, D. J., Greenfield, E. J., Hoehn, R. E., & Lapoint, E. (2013). Carbon storage and sequestration by trees in urban and rural areas of the United States. Environmental Pollution, 178, 229-236.
 */
export function calculatePM25Deposition({
  windSpeed,
  LAI,
  canopyDiameter,
  ambientPM25,
  speciesLeafType,
}: {
  windSpeed: number;
  LAI: number;
  canopyDiameter: number;
  ambientPM25: number;
  speciesLeafType: string;
}) {
  const isConifer = speciesLeafType.toLowerCase().includes('conifer');

  // Constants - Zhang et al. (2001) / Nowak et al. (2013)
  const k = 0.4; // von Kármán constant
  const zr = 10; // Meteorological reference height (10 m)
  const z0 = isConifer ? 0.15 : 0.08; // Roughness length z0: 0.15 m for conifer, 0.08 m for broadleaf

  const safeWindSpeed = Math.max(windSpeed, 0.1); // Prevent division by zero
  const safeLai = Math.max(LAI, 0.1); // Prevent division by zero

  // Step 1: Aerodynamic resistance Ra (s/m)
  // Ra = [ln(zr / z0)]² / (k² * Wind_Speed)
  const lnRatio = Math.log(zr / z0);
  const Ra = Math.pow(lnRatio, 2) / (Math.pow(k, 2) * safeWindSpeed);

  // Step 2: Quasi-laminar boundary layer resistance Rb (s/m)
  // Rb = 5 s/m (conifer - fine needle geometry), 8 s/m (broadleaf)
  const Rb = isConifer ? 5 : 8;

  // Step 3: Canopy/surface resistance Rc (s/m)
  // Rc = Rc_base / (LAI / LAI_reference)
  const RcBase = isConifer ? 40 : 60; // 40 s/m for conifer, 60 s/m for broadleaf
  const laiReference = 5.0; // LAI reference normalizing constant
  const Rc = RcBase / (safeLai / laiReference);

  // Step 4: Total deposition velocity Vd (m/s)
  // Vd = 1 / (Ra + Rb + Rc)
  const Rtotal = Ra + Rb + Rc;
  const vdMPS = 1 / Rtotal; // Deposition velocity in m/s
  const vdPerHour = vdMPS * 3600; // Convert to m/hr

  // Step 5: Final PM2.5 mass flux P (mg/hr)
  // C (g/m³) = Ambient_PM25(µg/m³) * 1e-6
  // A (m²) = π * (Canopy_Diameter / 2)²
  // P (mg/hr) = Vd_hourly * C * A * 1000
  const canopyArea = Math.PI * Math.pow(canopyDiameter / 2, 2);
  const cGperM3 = ambientPM25 * 1e-6;
  const flux = vdPerHour * cGperM3; // Deposition flux F = Vd_hr * C (g/m²/hr)
  const pm25Intercepted = vdPerHour * cGperM3 * canopyArea * 1000; // P (mg/hr)

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
  };
}
