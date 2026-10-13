/**
 * Feature switches.
 *
 * FAULT_FINDER_ENABLED — the AI fault finding assistant is switched OFF
 * until its advice, wording and liability position have been reviewed
 * (lawyer + insurer + a licensed electrician). While off:
 *   - the menu items, field tab, job shortcut and product tour step are hidden
 *   - /dashboard/assistant and /field/assistant show a "not available" notice
 *   - /api/assistant returns 404, so nothing reaches the AI model
 *   - the landing page does not mention it
 * The code is kept. To turn it back on, set
 * NEXT_PUBLIC_FAULT_FINDER_ENABLED=true in Vercel and redeploy, and restore
 * the landing page copy.
 */
export const FAULT_FINDER_ENABLED = process.env.NEXT_PUBLIC_FAULT_FINDER_ENABLED === 'true'
