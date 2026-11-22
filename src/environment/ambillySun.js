import * as THREE from 'three';

/* =========================================================================
 * EXACT ASTRONOMICAL SOLAR SIMULATOR FOR:
 * Résidence CASSIOPÉE — 7 rue de la Fraternité, 74100 Ambilly (Haute-Savoie)
 * GPS: 46.1941° N, 6.2230° E · Elevation ~430 m · Floor: R+4 (+11.6 m)
 *
 * Plan Orientation from official SA Mont-Blanc blueprint (notif.png):
 *   Plan Top (-Z)    = NNE (17° East of True North)
 *   Plan Right (+X)  = ESE (107°)
 *   Plan Bottom (+Z) = SSW (197°) — Loggia, Chambre 1 & Chambre 2
 *   Plan Left (-X)   = WNW (287°) — Séjour windows, Kitchen, Chambre 3
 * ========================================================================= */

export const AMBILLY_LOCATION = {
  name: 'CASSIOPÉE · 7 rue de la Fraternité, 74100 Ambilly',
  latDeg: 46.1941,
  lonDeg: 6.2230,
  altitudeM: 430,
  floorLabel: '4ème étage (R+4)',
  floorHeightM: 11.6,
  planTopAzimuthDeg: 17 // Plan -Z points 17° clockwise (East) from True North
};

export const SEASON_PRESETS = [
  { id: 'summer',  label: 'Summer (21 Jun)',  month: 6,  day: 21, tzOffset: 2, dayOfYear: 172 },
  { id: 'spring',  label: 'Equinox (21 Mar)', month: 3,  day: 21, tzOffset: 1, dayOfYear: 80  },
  { id: 'autumn',  label: 'Autumn (22 Sep)',  month: 9,  day: 22, tzOffset: 2, dayOfYear: 265 },
  { id: 'winter',  label: 'Winter (21 Dec)',  month: 12, day: 21, tzOffset: 1, dayOfYear: 355 }
];

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Computes accurate solar azimuth (0°=N, 90°=E, 180°=S, 270°=W), solar elevation,
 * sunrise/sunset local hours, and 3D Three.js directional vector for Ambilly.
 */
export function computeAmbillySun(seasonId = 'summer', localHour = 15.5) {
  const season = SEASON_PRESETS.find(s => s.id === seasonId) || SEASON_PRESETS[0];
  const lat = AMBILLY_LOCATION.latDeg * DEG2RAD;
  const lon = AMBILLY_LOCATION.lonDeg;
  const doy = season.dayOfYear;
  const tz = season.tzOffset;

  // Fractional year (radians)
  const gamma = ((2 * Math.PI) / 365) * (doy - 1 + (localHour - 12) / 24);

  // Equation of time (minutes) — NOAA formulation
  const eqTime = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );

  // Solar declination angle (radians)
  const decl = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.001480 * Math.sin(3 * gamma);

  // True solar time (minutes) & hour angle (degrees)
  const timeOffset = eqTime + 4 * lon - 60 * tz;
  const tst = localHour * 60 + timeOffset;
  const haDeg = tst / 4 - 180;
  const ha = haDeg * DEG2RAD;

  // Solar zenith & elevation
  const sinElev = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const elevRad = Math.asin(Math.max(-1, Math.min(1, sinElev)));
  const elevationDeg = elevRad * RAD2DEG;

  // Solar azimuth clockwise from True North
  const cosAz = (Math.sin(decl) - Math.sin(lat) * Math.sin(elevRad)) / (Math.cos(lat) * Math.cos(elevRad) + 1e-6);
  let azimuthDeg = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD2DEG;
  if (haDeg > 0) azimuthDeg = 360 - azimuthDeg;

  // Sunrise / Sunset hours for this date in Ambilly
  const cosHaSR = (Math.cos(90.833 * DEG2RAD) / (Math.cos(lat) * Math.cos(decl))) - Math.tan(lat) * Math.tan(decl);
  const haSR = Math.acos(Math.max(-1, Math.min(1, cosHaSR))) * RAD2DEG;
  const solarNoonMin = 720 - 4 * lon - eqTime + tz * 60;
  const sunriseHour = (solarNoonMin - haSR * 4) / 60;
  const sunsetHour = (solarNoonMin + haSR * 4) / 60;

  // Convert geographic azimuth to Three.js Apartment coordinates:
  // Plan -Z is at azimuth = planTopAzimuthDeg (17° East of True North).
  // Relative angle clockwise from -Z: rel = azimuth - 17°.
  // In Three.js: +X = sin(rel), -Z = cos(rel) => z = -cos(rel).
  const relRad = (azimuthDeg - AMBILLY_LOCATION.planTopAzimuthDeg) * DEG2RAD;
  const clampedElevRad = Math.max(0.03, elevRad);
  const cosE = Math.cos(clampedElevRad);
  const dir = new THREE.Vector3(
    Math.sin(relRad) * cosE,
    Math.sin(clampedElevRad),
    -Math.cos(relRad) * cosE
  ).normalize();

  // Physically-calibrated sky & sunlight colors based on solar elevation
  const isNight = elevationDeg < -2.5;
  const isTwilight = elevationDeg >= -2.5 && elevationDeg < 7.0;
  const goldenFactor = Math.max(0, Math.min(1, 1 - (elevationDeg - 3) / 18));

  let sunColor = new THREE.Color('#FFFBF2');
  let skyZenith = new THREE.Color('#5A92D6');
  let skyHorizon = new THREE.Color('#DCE8F4');
  let sunIntensity = 2.05;
  let hemiIntensity = 0.72;
  let envIntensity = 0.50;

  if (isNight) {
    sunColor.set('#7A92C4');
    skyZenith.set('#0C1322');
    skyHorizon.set('#1C2840');
    sunIntensity = 0.16;
    hemiIntensity = 0.22;
    envIntensity = 0.14;
  } else if (isTwilight) {
    const t = (elevationDeg + 2.5) / 9.5; // 0..1
    sunColor.set('#FF8B47').lerp(new THREE.Color('#FFD29E'), t);
    skyZenith.set('#1A2948').lerp(new THREE.Color('#4773B2'), t);
    skyHorizon.set('#D97852').lerp(new THREE.Color('#F5C89A'), t);
    sunIntensity = 0.25 + t * 1.15;
    hemiIntensity = 0.28 + t * 0.34;
    envIntensity = 0.20 + t * 0.22;
  } else {
    // Daylight with smooth golden-hour warmth when sun < 21°
    sunColor.set('#FFFBF2').lerp(new THREE.Color('#FFBE78'), goldenFactor * 0.72);
    skyZenith.set('#4D88D1').lerp(new THREE.Color('#3F6BA8'), goldenFactor * 0.5);
    skyHorizon.set('#E0EBF5').lerp(new THREE.Color('#F5D0A8'), goldenFactor * 0.75);
    const elevBoost = Math.min(1, elevationDeg / 40);
    sunIntensity = 1.35 + elevBoost * 0.85;
    hemiIntensity = 0.56 + elevBoost * 0.26;
    envIntensity = 0.42 + elevBoost * 0.14;
  }

  return {
    season,
    localHour,
    azimuthDeg,
    elevationDeg,
    sunriseHour,
    sunsetHour,
    isNight,
    isTwilight,
    lightsRecommendedOn: elevationDeg < 10,
    dir,
    sunColor,
    skyZenith,
    skyHorizon,
    sunIntensity,
    hemiIntensity,
    envIntensity
  };
}

export function formatHour(h) {
  const wrapped = ((h % 24) + 24) % 24;
  const hh = Math.floor(wrapped);
  const mm = Math.round((wrapped - hh) * 60);
  const finalH = mm === 60 ? (hh + 1) % 24 : hh;
  const finalM = mm === 60 ? 0 : mm;
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
}

export function compassLabel(azDeg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round((((azDeg % 360) + 360) % 360) / 22.5) % 16];
}
