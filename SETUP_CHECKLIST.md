# ✅ Multi-Tenant Auth System - Setup Checklist

## Phase 1: Supabase Configuration

- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Go to **SQL Editor** in Supabase dashboard
- [ ] Copy entire contents of `supabase/migrations/001_init_multitenant_schema.sql`
- [ ] Execute SQL to create:
  - [ ] `tenants` table
  - [ ] `tenant_members` table
  - [ ] `profiles` table
  - [ ] RLS policies
  - [ ] Trigger for new user signup
  - [ ] Function for tenant creation
- [ ] Go to **Settings → API**
  - [ ] Copy Project URL → `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] Copy anon public key → `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Go to **Authentication → Providers**
  - [ ] Enable **Email** provider
  - [ ] (Optional) Enable social providers (Google, GitHub, etc.)

## Phase 2: Environment Setup

- [ ] Create `.env.local` file in project root with:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
  ```
- [ ] Verify variables are accessible: `echo $NEXT_PUBLIC_SUPABASE_URL`

## Phase 3: Install & Run

- [ ] Install dependencies: `npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Open `http://localhost:3000`

## Phase 4: Test Authentication Flow

- [ ] **Sign Up**
  - [ ] Visit `/signup`
  - [ ] Create account with workspace name
  - [ ] Check email for verification link
  - [ ] Verify email
  - [ ] Redirected to dashboard ✓
  
- [ ] **Login**
  - [ ] Visit `/login`
  - [ ] Enter credentials from signup
  - [ ] Redirected to dashboard ✓
  - [ ] User profile displays correctly ✓

- [ ] **Dashboard Features**
  - [ ] Can see workspace name in navbar ✓
  - [ ] Can see user info in profile dropdown ✓
  - [ ] Navigation links work ✓

- [ ] **Workspace Switcher**
  - [ ] Create 2nd account with different workspace
  - [ ] Login with first account
  - [ ] Click workspace dropdown ✓
  - [ ] Both workspaces visible (if member of both) ✓

- [ ] **Team Management**
  - [ ] Visit `/dashboard/team`
  - [ ] See current team members ✓
  - [ ] (As admin) Can invite members ✓

- [ ] **Profile Settings**
  - [ ] Visit `/dashboard/profile`
  - [ ] See current profile info ✓
  - [ ] Update full name ✓
  - [ ] Changes persist after refresh ✓

- [ ] **Workspace Settings**
  - [ ] Visit `/dashboard/workspace`
  - [ ] See workspace information ✓
  - [ ] See your role ✓

- [ ] **Sign Out**
  - [ ] Click user menu → Sign Out
  - [ ] Redirected to login page ✓
  - [ ] Cannot access dashboard without login ✓

## Phase 5: Database Verification

In Supabase dashboard → **SQL Editor**:

```sql
-- Check tenants table
SELECT * FROM public.tenants;

-- Check profiles table  
SELECT * FROM public.profiles;

-- Check tenant_members table
SELECT * FROM public.tenant_members;
```

Expected results:
- 1+ rows in `tenants` table
- Profile for each signed-up user
- Memberships showing users and their roles

## Phase 6: Security Verification

- [ ] Cannot access `/dashboard` without login
- [ ] Cannot view other user's data
- [ ] Cannot create records outside your tenant
- [ ] Session persists on page refresh
- [ ] Logout clears session

## Phase 7: Production Readiness

- [ ] Review `MULTITENANT_AUTH_GUIDE.md`
- [ ] Configure Supabase email templates (optional)
- [ ] Set up error logging/monitoring
- [ ] Configure CORS for production domain
- [ ] Plan backup strategy
- [ ] Test on mobile devices
- [ ] Review security best practices

## Phase 8: Deployment (Optional)

- [ ] Push to GitHub
- [ ] Connect Vercel project
- [ ] Add environment variables to Vercel
- [ ] Deploy to production
- [ ] Test all flows in production
- [ ] Set up monitoring

## Common Issues & Fixes

### "PGRST116" Error
**Issue**: Row not found in database
**Fix**: Ensure data exists and RLS policies allow access

### Auth state not persisting
**Issue**: Session lost on refresh
**Fix**: 
- Clear browser cookies
- Check `middleware.ts` exists in root
- Verify environment variables loaded

### "Email undefined" in Supabase
**Issue**: Email field not populated
**Fix**: 
- Check user signup includes email parameter
- Verify email provider enabled in Supabase

### Cannot invite team members
**Issue**: Permission denied
**Fix**:
- Verify you're admin/owner in workspace
- Check RLS policies on tenant_members table

## File Structure Verification

Ensure these files exist:

```
fieldms/
├── .env.local                           ✓
├── app/
│   ├── page.tsx                         ✓ Landing
│   ├── login/page.tsx                   ✓ Login
│   ├── signup/page.tsx                  ✓ Signup
│   ├── verify-email/page.tsx            ✓ Email verify
│   ├── dashboard/
│   │   ├── layout.tsx                   ✓ Protected layout
│   │   ├── page.tsx                     ✓ Dashboard home
│   │   ├── team/page.tsx                ✓ Team mgmt
│   │   ├── profile/page.tsx             ✓ Profile
│   │   └── workspace/page.tsx           ✓ Workspace
│   └── layout.tsx                       ✓ Root layout
├── components/
│   └── Navbar.tsx                       ✓ Navigation
├── context/
│   └── AuthContext.tsx                  ✓ Auth state
├── lib/
│   └── auth.ts                          ✓ Auth functions
├── utils/supabase/
│   ├── client.ts                        ✓ Browser client
│   └── server.ts                        ✓ Server client
├── types/
│   └── database.ts                      ✓ Types
├── middleware.ts                        ✓ Auth middleware
├── supabase/migrations/
│   └── 001_init_multitenant_schema.sql  ✓ Schema
├── MULTITENANT_AUTH_GUIDE.md            ✓ Guide
└── SETUP_CHECKLIST.md                   ✓ This file
```

## Success Criteria ✓

Your multi-tenant system is ready when:

- ✅ Sign up creates user + workspace
- ✅ Login maintains session
- ✅ Multiple workspaces work
- ✅ Team member management works
- ✅ RLS policies enforce access
- ✅ All pages load correctly
- ✅ No browser console errors
- ✅ No SQL errors in Supabase logs

## Next Steps

1. **Review the code** - Understand how everything connects
2. **Customize** - Add your business-specific features
3. **Extend** - Add more tables and relationships
4. **Deploy** - Push to production when ready
5. **Monitor** - Set up logging and error tracking

---

**Questions?** Check `MULTITENANT_AUTH_GUIDE.md` for detailed documentation.
