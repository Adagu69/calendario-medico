import express from 'express';
import { query, validationResult } from 'express-validator';
import ExcelJS from 'exceljs';
import pool from '../database/connection';
import { verifyToken, roleMiddleware } from '../middleware/auth';

const router = express.Router();

const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const requireReportingAccess = roleMiddleware(['admin', 'gerencia', 'jefe']);

interface AggregatedShiftRow {
  doctor_id: number;
  doc_first_name: string | null;
  doc_last_name: string | null;
  doctor_full_name: string;
  doc_type: string | null;
  doc_number: string | null;
  profession: string | null;
  license_number: string | null;
  specialty_id: number | null;
  specialty_name: string | null;
  service_id: number | null;
  service_name: string | null;
  display_day: number;
  day_date: string;
  first_start_time: string | null;
  last_end_time: string | null;
  spills_next_day: boolean;
  day_hours: number;
  total_hours: number;
}

const REPORT_QUERY = `
WITH params AS (
  SELECT 
    to_date($1 || '-01', 'YYYY-MM-DD') AS month_start,
    (to_date($1 || '-01', 'YYYY-MM-DD') + INTERVAL '1 month') AS month_end,
    EXTRACT(YEAR FROM to_date($1 || '-01', 'YYYY-MM-DD'))::int AS year,
    EXTRACT(MONTH FROM to_date($1 || '-01', 'YYYY-MM-DD'))::int AS month
),
target_months AS (
  SELECT
    sm.id AS month_id,
    sm.doctor_id,
    sm.section_id,
    d.name AS doctor_full_name,
    split_part(d.name, ' ', 1) AS doc_first_name,
    CASE
      WHEN strpos(d.name, ' ') > 0 THEN trim(substr(d.name, strpos(d.name, ' ') + 1))
      ELSE d.name
    END AS doc_last_name,
    d.license AS license_number,
    sec.name AS section_name,
    spec.specialty_id,
    spec.specialty_name,
    params.year,
    params.month
  FROM sgh_months sm
  JOIN params ON params.year = sm.year AND params.month = sm.month
  JOIN sgh_doctors d ON d.id = sm.doctor_id
  LEFT JOIN sgh_sections sec ON sec.id = sm.section_id
  LEFT JOIN LATERAL (
    SELECT ds.specialty_id, sp.name AS specialty_name
    FROM sgh_doctor_specialties ds
    JOIN sgh_specialties sp ON sp.id = ds.specialty_id
    WHERE ds.doctor_id = sm.doctor_id
    ORDER BY sp.name
    LIMIT 1
  ) spec ON TRUE
  WHERE ($2::int IS NULL OR spec.specialty_id = $2::int)
    AND ($3::int IS NULL OR sm.section_id = $3::int)
    AND ($4::int IS NULL OR sm.doctor_id = $4::int)
),
day_slots AS (
  SELECT
    tm.month_id,
    tm.doctor_id,
    tm.section_id,
    tm.specialty_id,
    tm.doc_first_name,
    tm.doc_last_name,
    tm.doctor_full_name,
    tm.license_number,
    tm.section_name,
    tm.specialty_name,
    tm.year,
    tm.month,
    md.day AS original_day,
    CASE
      WHEN md.day BETWEEN 1 AND EXTRACT(DAY FROM (make_date(tm.year, tm.month, 1) + INTERVAL '1 month - 1 day'))::int
        THEN make_date(tm.year, tm.month, md.day)
      ELSE (make_date(tm.year, tm.month, 1) + INTERVAL '1 month - 1 day')::date
    END AS effective_date,
    ts.start_time,
    ts.end_time,
    ts.id AS time_slot_id
  FROM sgh_month_days md
  JOIN target_months tm ON tm.month_id = md.month_id
  JOIN LATERAL unnest(COALESCE(md.time_slot_ids, '{}')) AS slot_id(slot_id) ON TRUE
  JOIN sgh_time_slots ts ON ts.id = slot_id.slot_id
),
normalized_slots AS (
  SELECT
    ds.*,
    (ds.effective_date + ds.start_time)::timestamp AS start_ts,
    CASE
      WHEN ds.end_time >= ds.start_time THEN (ds.effective_date + ds.end_time)::timestamp
      ELSE (ds.effective_date + ds.end_time)::timestamp + INTERVAL '1 day'
    END AS adjusted_end_ts
  FROM day_slots ds
),
expanded AS (
  SELECT
    ns.*,
    generate_series(
      date_trunc('day', ns.start_ts),
      date_trunc('day', ns.adjusted_end_ts),
      INTERVAL '1 day'
    ) AS day_start
  FROM normalized_slots ns
),
segments AS (
  SELECT
    doctor_id,
    specialty_id,
    section_id,
    doc_first_name,
    doc_last_name,
    doctor_full_name,
    license_number,
    section_name,
    specialty_name,
    original_day,
    GREATEST(
      1,
      LEAST(
        31,
        CASE
          WHEN original_day IS NOT NULL THEN original_day + (day_start::date - date_trunc('day', start_ts)::date)
          ELSE EXTRACT(DAY FROM day_start)::int
        END
      )
    ) AS display_day,
    day_start::date AS day_date,
    GREATEST(start_ts, day_start) AS segment_start,
    LEAST(adjusted_end_ts, day_start + INTERVAL '1 day') AS segment_end,
    adjusted_end_ts
  FROM expanded
),
aggregated AS (
  SELECT
    doctor_id,
    specialty_id,
    section_id,
    doc_first_name,
    doc_last_name,
    doctor_full_name,
    license_number,
    section_name,
    specialty_name,
    display_day,
    day_date,
    MIN(segment_start) AS first_start,
    MAX(segment_end) AS last_end,
    SUM(EXTRACT(EPOCH FROM (segment_end - segment_start)) / 3600.0) AS day_hours,
    BOOL_OR(adjusted_end_ts::date > day_date) AS spills_next_day
  FROM segments
  GROUP BY doctor_id, specialty_id, section_id, doc_first_name, doc_last_name, doctor_full_name, license_number, section_name, specialty_name, display_day, day_date
),
monthly_hours AS (
  SELECT doctor_id, specialty_id, section_id,
         SUM(day_hours) AS total_hours
  FROM aggregated
  GROUP BY doctor_id, specialty_id, section_id
)
SELECT
  aggregated.doctor_id,
  aggregated.doc_first_name,
  aggregated.doc_last_name,
  aggregated.doctor_full_name,
  ''::text AS doc_type,
  NULL::text AS doc_number,
  'Medico'::text AS profession,
  aggregated.license_number,
  aggregated.specialty_id,
  aggregated.specialty_name,
  aggregated.section_id AS service_id,
  aggregated.section_name AS service_name,
  aggregated.display_day,
  aggregated.day_date::text,
  to_char(aggregated.first_start, 'HH24:MI') AS first_start_time,
  to_char(aggregated.last_end, 'HH24:MI') AS last_end_time,
  aggregated.spills_next_day,
  aggregated.day_hours,
  mh.total_hours
FROM aggregated
LEFT JOIN monthly_hours mh
  ON mh.doctor_id = aggregated.doctor_id
 AND COALESCE(mh.specialty_id, -1) = COALESCE(aggregated.specialty_id, -1)
 AND COALESCE(mh.section_id, -1) = COALESCE(aggregated.section_id, -1)
ORDER BY aggregated.doc_last_name, aggregated.doc_first_name, aggregated.display_day;
`;

const buildWorkbook = (month: string, data: AggregatedShiftRow[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte Mensual');

  const ipressName = process.env.IPRESS_NAME || 'CLINICA MUNDO SALUD SAC';
  const ipressCode = process.env.IPRESS_CODE || '00009641';
  const ipressDisplay = process.env.IPRESS_DISPLAY_NAME || ipressName;
  const ipressRed = process.env.IPRESS_RED || 'NO PERTENECE A NINGUNA RED';

  const baseColumns = [
    { header: 'IPRESS', key: 'ipress', width: 30 },
    { header: 'Codigo Unico', key: 'codigo_unico', width: 15 },
    { header: 'Nombre', key: 'nombre_ipress', width: 30 },
    { header: 'RED', key: 'red', width: 28 },
    { header: 'Tipo Documento', key: 'tipo_documento', width: 16 },
    { header: 'Numero Documento', key: 'numero_documento', width: 18 },
    { header: 'Profesion', key: 'profesion', width: 20 },
    { header: 'Numero de Colegiatura', key: 'numero_colegiatura', width: 20 },
    { header: 'Apellidos', key: 'apellidos', width: 24 },
    { header: 'Nombres', key: 'nombres', width: 22 },
    { header: 'Especialidad', key: 'especialidad', width: 26 },
    { header: 'Servicio', key: 'servicio', width: 26 }
  ];

  const dayColumns: Array<{ header: string; key: string; width: number }> = [];
  for (let day = 1; day <= 31; day++) {
    dayColumns.push({ header: `Dia ${day} - Ingreso`, key: `dia_${day}_ingreso`, width: 12 });
    dayColumns.push({ header: `Dia ${day} - Salida`, key: `dia_${day}_salida`, width: 12 });
  }

  const columns = [
    ...baseColumns,
    ...dayColumns,
    { header: 'Horas Mensuales', key: 'horas_mensuales', width: 16 }
  ];

  worksheet.columns = columns;
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true };

  interface DayInfo { ingreso: string; salida: string; }
  interface ReportRow {
    doctorId: number;
    docType: string | null;
    docNumber: string | null;
    profession: string | null;
    licenseNumber: string | null;
    lastName: string;
    firstName: string;
    specialtyName: string | null;
    serviceName: string | null;
    totalHours: number;
    days: Record<number, DayInfo>;
  }

  const mapKey = (row: AggregatedShiftRow) => `${row.doctor_id}::${row.specialty_id ?? 'null'}::${row.service_id ?? 'null'}`;
  const rowsByDoctor = new Map<string, ReportRow>();

  data.forEach((row) => {
    const key = mapKey(row);
    if (!rowsByDoctor.has(key)) {
      const firstName = (row.doc_first_name || '').trim();
      const lastName = (row.doc_last_name || '').trim();
      rowsByDoctor.set(key, {
        doctorId: row.doctor_id,
        docType: row.doc_type,
        docNumber: row.doc_number,
        profession: row.profession,
        licenseNumber: row.license_number,
        lastName: lastName || row.doctor_full_name,
        firstName: firstName || row.doctor_full_name,
        specialtyName: row.specialty_name,
        serviceName: row.service_name,
        totalHours: row.total_hours ?? 0,
        days: {}
      });
    }

    const container = rowsByDoctor.get(key)!;
    container.totalHours = row.total_hours ?? container.totalHours;

    const candidateDay = Number.isFinite(row.display_day) ? row.display_day : NaN;
    const fallbackDay = Number(row.day_date.slice(-2));
    const dayNumber = Number.isFinite(candidateDay) && candidateDay >= 1 && candidateDay <= 31
      ? Math.trunc(candidateDay)
      : (!Number.isNaN(fallbackDay) && fallbackDay >= 1 && fallbackDay <= 31 ? Math.trunc(fallbackDay) : null);

    if (dayNumber) {
      const ingreso = row.first_start_time || '';
      let salida = row.last_end_time || '';
      if (row.spills_next_day && salida === '00:00') {
        salida = '23:59';
      }
      container.days[dayNumber] = { ingreso, salida };
    }
  });

  const formatDocType = (value: string | null) => {
    if (!value) return '';
    const normalized = value.toUpperCase();
    if (['DNI', 'CEX', 'PAS'].includes(normalized)) {
      return normalized;
    }
    return normalized;
  };

  for (const container of rowsByDoctor.values()) {
    const row: Record<string, string | number> = {
      ipress: ipressName,
      codigo_unico: ipressCode,
      nombre_ipress: ipressDisplay,
      red: ipressRed,
      tipo_documento: formatDocType(container.docType),
      numero_documento: container.docNumber || '',
      profesion: container.profession || '',
      numero_colegiatura: container.licenseNumber || '',
      apellidos: container.lastName,
      nombres: container.firstName,
      especialidad: container.specialtyName || '',
      servicio: container.serviceName || ''
    };

    for (let day = 1; day <= 31; day++) {
      const info = container.days[day];
      row[`dia_${day}_ingreso`] = info ? info.ingreso : '';
      row[`dia_${day}_salida`] = info ? info.salida : '';
    }

    row.horas_mensuales = Number(container.totalHours ?? 0).toFixed(2);

    worksheet.addRow(row);
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  };

  return workbook;
};

router.get(
  '/monthly-schedule',
  verifyToken,
  requireReportingAccess,
  [
    query('month').matches(/^\d{4}-\d{2}$/).withMessage('Formato de mes invalido (YYYY-MM)'),
    query('specialty_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('specialty_id debe ser un numero'),
    query('service_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('service_id debe ser un numero'),
    query('doctor_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('doctor_id debe ser un numero'),
    handleValidationErrors
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const month = req.query.month as string;
      const specialtyId = req.query.specialty_id ? Number(req.query.specialty_id) : null;
      const serviceId = req.query.service_id ? Number(req.query.service_id) : null;
      const doctorId = req.query.doctor_id ? Number(req.query.doctor_id) : null;

      const result = await pool.query<AggregatedShiftRow>(REPORT_QUERY, [
        month,
        specialtyId,
        serviceId,
        doctorId
      ]);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron turnos para los filtros seleccionados'
        });
      }

      const workbook = buildWorkbook(month, result.rows);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="reporte-turnos-${month}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ success: false, message: 'Error al generar el reporte' });
    }
  }
);

export default router;
