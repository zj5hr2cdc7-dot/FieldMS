# 🚀 Quick Start - Multi-Tenant Auth System

Everything is ready. Here's what to do next.

## 1️⃣ Set Up Supabase (5 minutes)

### Create Project
1. Go to https://supabase.com
2. Click "New project"
3. Create a new project (free tier works)

### Run Database Migrations
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of:
   ```
   supabase/migrations/001_init_multitenant_schema.sql
   ```
4. Paste into the SQL editor
5. Click **Run** (execute the SQL)

### Get Your API Keys
1. Go to **Settings → API**
2. Copy these two values:
   - `Project URL` 
   - `anon public key`

## 2️⃣ Configure Environment

Edit `.env.local` and paste:
```
NEXT_PUBLIC_SUPABASE_URL=your_url_from_step_1
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_from_step_1
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
MYOB_CLIENT_ID=your_myob_client_id
MYOB_CLIENT_SECRET=your_myob_client_secret
MYOB_API_KEY=your_myob_api_key
MYOB_API_VERSION=v2
```

## 3️⃣ Enable Email Authentication

In Supabase dashboard:
1. Go to **Authentication → Providers**
2. Click **Email**
3. Click **Enable** (already configured)

## 4️⃣ Start the App

```bash
cd /Users/jackgapes/fieldms
npm run dev
```

Open http://localhost:3000

## 5️⃣ Test the System

### Sign Up
1. Click **Get Started**
2. Enter: email, password, name, workspace name
3. Check email for verification link
4. Click link to verify
5. ✅ You're in the dashboard!

### Try These Features
- **Workspace Switcher** - Click workspace name in navbar
- **Team Members** - Go to `/dashboard/team`
- **Profile** - Go to `/dashboard/profile`
- **Workspace Info** - Go to `/dashboard/workspace`
- **Sign Out** - Click your avatar → Sign Out

## 📁 What Was Built

| Component | Purpose |
|-----------|---------|
| **Database Schema** | Tenants, users, team members with RLS |
| **Auth System** | Sign up, login, email verification |
| **Multi-Tenant** | Create workspaces, switch between them |
| **UI Pages** | Landing, auth, dashboard, team, profile |
| **Components** | Navbar with workspace switcher |
| **Context** | Global auth state management |
| **Security** | Row-level security policies |

## 🔑 Key Files

- `lib/auth.ts` - All auth functions
- `context/AuthContext.tsx` - Auth state provider
- `middleware.ts` - Session persistence (removed - deprecated in Next.js 16)
- `app/dashboard/layout.tsx` - Protected routes
- `supabase/migrations/001_init...sql` - Database schema

## ⚡ Common Next Steps

### Add a Data Table
```tsx
'use client'

import { useAuthContext } from '@/context/AuthContext'
import { createClient } from '@/utils/supabase/client'

export default function ItemsPage() {
  const { currentTenant } = useAuthContext()
  const supabase = createClient()

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select()
      .eq('tenant_id', currentTenant?.id)
    
    return data
  }
  
  // Use fetchItems in useEffect
}
```

### Check User Authentication
```tsx
import { useAuthContext } from '@/context/AuthContext'

export default function Component() {
  const { session, userRole } = useAuthContext()
  
  if (!session) return <div>Not authenticated</div>
  if (userRole !== 'admin') return <div>Not authorized</div>
  
  return <div>Only admins see this</div>
}
```

### Create Workspace Admin Page
```tsx
'use client'

import { useAuthContext } from '@/context/AuthContext'

export default function AdminPage() {
  const { userRole, currentTenant } = useAuthContext()
  
  if (!['owner', 'admin'].includes(userRole || ''))
    return <div>Access Denied</div>
  
  return <div>Admin Panel for {currentTenant?.name}</div>
}
```

## 📚 Documentation

- **Complete Guide** → `MULTITENANT_AUTH_GUIDE.md`
- **Setup Checklist** → `SETUP_CHECKLIST.md`
- **Supabase Setup** → `SUPABASE_SETUP.md`

## 🆘 Troubleshooting

### Build Errors
```bash
rm -rf .next node_modules/.cache
npm run build
```

### Auth Not Working
1. Check `.env.local` has correct credentials
2. Verify email provider is enabled in Supabase
3. Check RLS policies were created (run SQL again)

### Can't See Workspaces
1. Ensure you're signed in
2. Check you're member of workspace (check Supabase)
3. Refresh page

### Email Not Sending
1. Verify email provider is enabled
2. Check spam folder
3. Check Supabase logs

## ✅ Success Criteria

Your system is ready when:
- ✅ Can sign up and verify email
- ✅ Can log in
- ✅ Dashboard displays
- ✅ Can see workspace info
- ✅ Can create workspaces (sign up separately)
- ✅ No console errors

## 🎉 You're All Set!

Your production-ready multi-tenant system is ready to go. Start building!

**Questions?** See the full docs in `MULTITENANT_AUTH_GUIDE.md`
