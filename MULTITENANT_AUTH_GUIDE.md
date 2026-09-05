# Multi-Tenant Authentication System - Complete Setup Guide

This is a production-ready multi-tenant business management system built with Next.js 14, Supabase, and TypeScript.

## 📋 What's Included

### Database Schema
- **tenants**: Organizations/workspaces
- **tenant_members**: User membership and roles (owner, admin, member)
- **profiles**: User profile information
- **RLS Policies**: Secure data access per tenant

### Authentication
- Email/password signup and login
- Session management with Supabase SSR
- Protected routes and layouts
- Auth state persistence with middleware
- User context with hooks

### Multi-Tenant Features
- Create multiple workspaces
- Switch between workspaces
- Invite team members
- Role-based access control (RBAC)
- Admin and member management

### Pages & Components
- `/` - Landing page
- `/signup` - Create account with workspace
- `/login` - Sign in
- `/verify-email` - Email verification
- `/dashboard` - Main dashboard
- `/dashboard/team` - Team member management
- `/dashboard/profile` - User profile settings
- `/dashboard/workspace` - Workspace information

## 🚀 Getting Started

### 1. Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and copy the entire contents of `supabase/migrations/001_init_multitenant_schema.sql`
4. Run the SQL to create tables and policies
5. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Update Environment Variables

Create/update `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Enable Email Provider

In Supabase Dashboard:
1. Go to **Authentication → Providers**
2. Enable **Email**
3. Configure email templates (optional)

### 4. Install Dependencies

All dependencies are already installed, but verify with:
```bash
npm ls @supabase/supabase-js @supabase/ssr
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and test the auth flow:
- Sign up → Creates a workspace
- Login → Access dashboard
- Switch workspaces → Use dropdown
- Manage team → Invite members

## 📁 Project Structure

```
app/
├── page.tsx                 # Landing page
├── login/page.tsx          # Login page
├── signup/page.tsx         # Signup with workspace creation
├── verify-email/page.tsx   # Email verification
├── dashboard/
│   ├── layout.tsx          # Protected layout with auth check
│   ├── page.tsx            # Dashboard home
│   ├── team/page.tsx       # Team management
│   ├── profile/page.tsx    # User profile
│   └── workspace/page.tsx  # Workspace settings
├── layout.tsx              # Root layout with AuthProvider
└── globals.css             # Tailwind styles

components/
├── Navbar.tsx              # Navigation with workspace switcher

context/
├── AuthContext.tsx         # Auth state provider

lib/
├── auth.ts                 # All auth functions

utils/supabase/
├── client.ts              # Browser client
├── server.ts              # Server client

types/
├── database.ts            # TypeScript types

middleware.ts              # Auth middleware (removed - deprecated in Next.js 16)

supabase/migrations/
├── 001_init_multitenant_schema.sql  # Database schema
```

## 🔐 Authentication Flow

### Sign Up Flow
1. User enters email, password, full name, workspace name
2. `signUpWithEmail()` creates auth user
3. `handle_new_user()` trigger creates profile
4. `create_tenant_with_owner()` creates workspace and adds user as owner
5. User redirected to email verification
6. After verification → dashboard

### Login Flow
1. User enters email and password
2. `signInWithEmail()` authenticates
3. `getCurrentSession()` loads session with tenant and role
4. Redirected to dashboard

### Session Management (No Middleware)

**Note:** Middleware has been removed as it's deprecated in Next.js 16. Session management now uses:

1. **AuthContext** - Refreshes session on app load and auth state changes
2. **Protected Layouts** - Validate auth state on route access
3. **Supabase Client** - Handles token refresh automatically

This approach is simpler and more aligned with Next.js 16's architecture.

## 🏗️ How Multi-Tenancy Works

### Row-Level Security (RLS)
All tables have RLS policies ensuring users can only access their tenant's data:

```sql
CREATE POLICY "Users can view tenants they belong to"
  ON public.tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM public.tenant_members 
      WHERE user_id = auth.uid()
    )
  );
```

### Tenant Isolation
- Users see only tenants they're members of
- Data queries automatically filtered by tenant
- No way to access other tenant data even with direct SQL

### Role-Based Access
- **Owner**: Full workspace control, can delete workspace
- **Admin**: Manage team members and settings
- **Member**: Read/use workspace features

## 💡 Usage Examples

### Fetch Data for Current Tenant

```tsx
'use client'

import { useAuthContext } from '@/context/AuthContext'
import { createClient } from '@/utils/supabase/client'

export default function Component() {
  const { currentTenant } = useAuthContext()
  const supabase = createClient()

  const [data, setData] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('items')  // Your table
        .select()
        .eq('tenant_id', currentTenant?.id)

      if (error) console.error(error)
      else setData(data)
    }

    if (currentTenant) fetchData()
  }, [currentTenant, supabase])

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

### Create Data in Current Tenant

```tsx
const { currentTenant } = useAuthContext()

const handleCreate = async (itemData) => {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('items')
    .insert({
      tenant_id: currentTenant!.id,
      ...itemData,
    })
    .select()

  if (error) console.error(error)
  else return data
}
```

### Check User Role

```tsx
const { userRole } = useAuthContext()

if (userRole === 'admin' || userRole === 'owner') {
  // Show admin controls
}
```

### Use Auth Context in Components

```tsx
'use client'

import { useAuthContext } from '@/context/AuthContext'

export default function Component() {
  const {
    session,           // Current auth user + profile
    currentTenant,     // Current workspace
    tenants,           // All user's workspaces
    userRole,          // User's role in current tenant
    switchTenant,      // Function to switch workspaces
    refetchSession,    // Refresh session
    loading,           // Loading state
  } = useAuthContext()

  if (loading) return <div>Loading...</div>
  if (!session) return <div>Not authenticated</div>

  return (
    <div>
      <h1>Welcome, {session.profile?.full_name}</h1>
      <p>Workspace: {currentTenant?.name}</p>
      <p>Your role: {userRole}</p>
    </div>
  )
}
```

## 🔧 Server-Side Operations

### Get Session in Server Component

```tsx
import { getCurrentSession } from '@/lib/auth'

export default async function Component() {
  const session = await getCurrentSession()

  if (!session) {
    return <div>Not authenticated</div>
  }

  return <div>Welcome, {session.profile?.full_name}</div>
}
```

### Query Data in Server Component

```tsx
import { createClient } from '@/utils/supabase/server'

export default async function Component() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('items')
    .select()
    .eq('tenant_id', 'tenant-id')

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

## 🛡️ Security Best Practices

### ✅ Already Implemented
- RLS policies on all tables
- Auth checks in middleware
- Protected routes with layout checks
- Environment variables for secrets
- Server-side session validation
- CSRF protection via Next.js

### ✅ To Consider for Production
- Add rate limiting on auth endpoints
- Implement CAPTCHA for signup
- Add 2FA support
- Log and monitor auth events
- Implement account recovery flows
- Add suspicious login detection
- Use HTTPS only in production
- Add Content Security Policy headers

## 📦 Dependencies

```json
{
  "next": "16.2.3",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "@supabase/supabase-js": "^2.30+",
  "@supabase/ssr": "^0.0.10+",
  "typescript": "^5",
  "tailwindcss": "^4"
}
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Environment Variables in Vercel
```
NEXT_PUBLIC_SUPABASE_URL = your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_key
```

### Configure Supabase
- Go to **Settings → API → CORS**
- Add your Vercel domain: `https://your-app.vercel.app`

## ⚡ Performance Optimizations

- Session cached in context
- Protected routes with early redirects
- RLS queries filtered at database
- Middleware refreshes session efficiently
- Tailwind CSS for small bundle

## 🐛 Troubleshooting

### "No matching policy" Error
- Ensure RLS policies are created in Supabase
- Check user is member of tenant
- Verify `tenant_id` is correct

### Auth state not persisting
- Clear browser cookies
- Check middleware.ts is in root
- Verify environment variables

### Can't see other tenants
- Ensure you added user to tenant via `tenant_members`
- Check RLS policies on table

### Email not sending
- Enable Email provider in Supabase
- Check email is confirmed in Supabase dashboard

## 📚 Next Steps

1. **Customize for your business**
   - Add your data tables
   - Extend tenant_members with custom fields
   - Add more features to dashboard

2. **Add features**
   - Billing/subscriptions
   - File uploads
   - Real-time collaboration
   - Audit logs

3. **Scale**
   - Add caching layer (Redis)
   - Optimize RLS queries
   - Monitor performance

## 📞 Support

For Supabase issues: [supabase.com/docs](https://supabase.com/docs)
For Next.js issues: [nextjs.org/docs](https://nextjs.org/docs)

---

**Built with ❤️ using Next.js + Supabase**
