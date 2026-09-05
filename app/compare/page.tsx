import { redirect } from 'next/navigation'

/** The design comparison concluded — Design B ("Daylight") won and now lives at /. */
export default function Compare() {
  redirect('/')
}
