import type { Metadata } from 'next'

/*
 * app/signup/page.tsx is a client component, and client components cannot
 * export metadata. This layout exists only to attach it — without it the
 * signup page inherits the homepage's title and description, so the two pages
 * look like duplicates to a crawler and neither ranks for its own intent.
 */
export const metadata: Metadata = {
  title: 'Create your account',
  description:
    'Start using FieldMS free during early access. Set up your electrical business in minutes — quoting, scheduling, test sheets and invoicing in one place.',
  alternates: { canonical: '/signup' },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
