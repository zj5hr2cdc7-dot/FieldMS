import { redirect } from 'next/navigation'

/** Design B was promoted to the homepage — this route now just redirects. */
export default function DesignB() {
  redirect('/')
}
