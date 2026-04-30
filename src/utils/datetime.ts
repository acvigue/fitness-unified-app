import {
  CalendarDate,
  CalendarDateTime,
  Time,
  getLocalTimeZone,
  parseAbsoluteToLocal,
  parseDate,
  parseTime,
} from '@internationalized/date'

export function ymdToCalendarDate(ymd: string): CalendarDate {
  return parseDate(ymd)
}

export function calendarDateToYmd(date: CalendarDate): string {
  return date.toString()
}

export function dateToYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  const x = new Date()
  x.setFullYear(y ?? x.getFullYear(), (m ?? 1) - 1, d ?? 1)
  x.setHours(0, 0, 0, 0)
  return x
}

export function hmToTime(hm: string): Time {
  return parseTime(hm)
}

export function timeToHm(time: Time): string {
  return time.toString().slice(0, 5)
}

export function isoToCalendarDate(iso: string): CalendarDate {
  const z = parseAbsoluteToLocal(iso)
  return new CalendarDate(z.year, z.month, z.day)
}

export function isoToTime(iso: string): Time {
  const z = parseAbsoluteToLocal(iso)
  return new Time(z.hour, z.minute, z.second)
}

export function isoToYmd(iso: string): string {
  return calendarDateToYmd(isoToCalendarDate(iso))
}

export function isoToHm(iso: string): string {
  return timeToHm(isoToTime(iso))
}

export function combineDateAndTime(date: CalendarDate, time: Time): string {
  const cdt = new CalendarDateTime(
    date.year,
    date.month,
    date.day,
    time.hour,
    time.minute,
    time.second,
  )
  return cdt.toDate(getLocalTimeZone()).toISOString()
}

export function combineYmdAndHm(ymd: string, hm: string): string {
  return combineDateAndTime(ymdToCalendarDate(ymd), hmToTime(hm))
}
