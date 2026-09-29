import { InviteAndEarn } from '@/components/referrals/InviteAndEarn';
import { getSiteUrl } from '@/lib/auth/site-url';
import { requireRole } from '@/lib/auth/guards';
import { ensureReferralCode, getReferralHistory, getReferralOverview } from '@/lib/db/referrals';
import { reportSilentDegradation } from '@/lib/observability/report';
import { REFERRAL_ROLES } from '@/lib/referrals/access';
import { referralUrl } from '@/lib/referrals/code';

export const metadata = { title: 'Invita y gana' };

/**
 * «Invita y gana» del alumno (spec §4). Un layout no protege una página: el guard
 * va aquí. El código se crea al abrir la pantalla si no existía (registro
 * anterior al programa, o su creación falló al registrarse).
 */
export default async function InvitarPage() {
  const { profile } = await requireRole([...REFERRAL_ROLES]);

  try {
    await ensureReferralCode(profile.id);
  } catch (err) {
    reportSilentDegradation('referral_code', err, { stage: 'page' });
  }

  const [overview, history] = await Promise.all([getReferralOverview(profile.id), getReferralHistory(profile.id)]);
  const url = overview.code ? referralUrl(overview.code.code, getSiteUrl()) : null;

  return <InviteAndEarn overview={overview} history={history} url={url} now={new Date()} />;
}
