-- ============================================================
-- Field-staff privacy: employees (member role) should only see
-- their OWN form submissions and the photos on jobs assigned to
-- them — not everything in the tenant. Owners/admins keep full
-- access for the management portal.
-- ============================================================

-- ── Form submissions ────────────────────────────────────────
DROP POLICY IF EXISTS "Tenant members manage submissions" ON public.form_submissions;

-- Owners & admins: full access across the tenant
CREATE POLICY "Admins manage all submissions"
  ON public.form_submissions FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Members (field staff): only submissions they created or that belong to a
-- job assigned to them.
CREATE POLICY "Members manage own submissions"
  ON public.form_submissions FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR job_id IN (SELECT id FROM public.jobs WHERE assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR job_id IN (SELECT id FROM public.jobs WHERE assigned_to = auth.uid())
    )
  );

-- ── Job photos ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Tenant members manage job photos" ON public.job_photos;

CREATE POLICY "Admins manage all job photos"
  ON public.job_photos FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Members manage photos on their jobs"
  ON public.job_photos FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND (
      uploaded_by = auth.uid()
      OR job_id IN (SELECT id FROM public.jobs WHERE assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND (
      uploaded_by = auth.uid()
      OR job_id IN (SELECT id FROM public.jobs WHERE assigned_to = auth.uid())
    )
  );
