# Supabase Setup Guide

## 1. Get Your Credentials

1. Go to [supabase.com](https://supabase.com)
2. Create a new project or select an existing one
3. Go to **Settings** → **API**
4. Copy your:
   - **Project URL** (to `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public key** (to `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## 2. Update Environment Variables

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 3. Project Structure

```
utils/supabase/
├── client.ts      # Browser client for use client components
├── server.ts      # Server client for server components & SSR
hooks/
├── useAuth.ts     # Authentication hook
middleware.ts     # Auth state middleware
```

## 4. Usage Examples

### Client Component - Fetch Data
```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function Component() {
  const [data, setData] = useState([])
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('your_table')
        .select()

      if (error) console.error(error)
      else setData(data)
    }

    fetchData()
  }, [supabase])

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

### Client Component - Authentication
```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'

export default function Component() {
  const { session, loading, supabase } = useAuth()

  const handleSignIn = async () => {
    await supabase.auth.signInWithPassword({
      email: 'user@example.com',
      password: 'password',
    })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <p>Loading...</p>
  if (session) return <button onClick={handleSignOut}>Sign Out</button>
  return <button onClick={handleSignIn}>Sign In</button>
}
```

### Server Component - Fetch Data
```tsx
import { createClient } from '@/utils/supabase/server'

export default async function Component() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('your_table')
    .select()

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

## 5. Production Checklist

- [ ] Set up Row Level Security (RLS) policies
- [ ] Add environment variables to deployment platform
- [ ] Configure CORS settings in Supabase dashboard
- [ ] Enable auth providers (if needed)
- [ ] Set up database backups
- [ ] Monitor Supabase real-time usage

## 6. Common Operations

### Create
```ts
const { data, error } = await supabase
  .from('table_name')
  .insert({ column1: 'value1', column2: 'value2' })
```

### Read
```ts
const { data, error } = await supabase
  .from('table_name')
  .select()
  .eq('column', 'value')
```

### Update
```ts
const { data, error } = await supabase
  .from('table_name')
  .update({ column: 'new_value' })
  .eq('id', 1)
```

### Delete
```ts
const { data, error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', 1)
```

## 7. Enable Authentication

In Supabase dashboard → **Authentication** → **Providers**:
- Email/Password
- OAuth providers (Google, GitHub, etc.)
- Magic Link
- etc.

Then use:
```ts
// Sign up
await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
})

// Sign in
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
})
```
