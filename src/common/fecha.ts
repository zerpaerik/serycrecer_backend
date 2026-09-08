/**
 * Fechas del negocio en la zona horaria del centro (Lima, Perú).
 *
 * El servidor puede correr en UTC (Railway lo hace), y ahí `new Date()` daría
 * el día siguiente desde las 19:00 hora de Lima. Todas las fechas "de negocio"
 * —caja del día, fecha de atención, de pago, de gasto— se calculan con esta
 * zona para que coincidan con lo que ve el centro.
 */
export const ZONA_HORARIA = 'America/Lima';

/** Fecha de hoy en Lima, formato ISO corto: "YYYY-MM-DD". */
export function hoyIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA });
}

/** Fecha en Lima desplazada n días respecto de hoy ("YYYY-MM-DD"). */
export function isoDesplazado(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA });
}

/** Hora actual en Lima, formato "HH:mm". */
export function horaLima(): string {
  return new Date().toLocaleTimeString('es-PE', {
    timeZone: ZONA_HORARIA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
