import type { Metadata } from 'next'

/*
 * Metadata holder for the client-component login page — same reason as
 * app/signup/layout.tsx.
 *
 * Indexed on purpose but given a low sitemap priority: people do search
 * "<product> login", and if we exclude the page they land on someone else's
 * summary of it instead. It carries no content worth ranking beyond that.
 */
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your FieldMS workspace.',
  alternates: { canonical: '/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
