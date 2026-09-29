import { InviteAndEarn } from '@/components/referrals/InviteAndEarn';
import { ParentShell } from '@/components/tutor/ParentShell';
import { getSiteUrl } from '@/lib/auth/site-url';
import { requireRole } from '@/lib/auth/guards';
import { ensureReferralCode, getReferralHistory, getReferralOverview } from '@/lib/db/referrals';
import { reportSilentDegradation } from '@/lib/observability/report';
import { referralUrl } from '@/lib/referrals/code';

export const metadata = { title: 'Invita y gana' };

/**
 * «Invita y gana» del TUTOR (spec §2: cualquier usuario, alumno o padre). Misma
 * pantalla que la del alumno, en el tema claro del panel parental. El layout de
 * `/tutor` exige PARENT y aun así la página vuelve a exigirlo: un layout no
 * protege una página.
 */
export default async function TutorInvitarPage() {
  const { profile } = await requireRole('PARENT');

  try {
    await ensureReferralCode(profile.id);
  } catch (err) {
    reportSilentDegradation('referral_code', err, { stage: 'page' });
  }

  const [overview, history] = await Promise.all([getReferralOverview(profile.id), getReferralHistory(profile.id)]);
  const url = overview.code ? referralUrl(overview.code.code, getSiteUrl()) : null;

  return (
    <ParentShell>
      <InviteAndEarn overview={overview} history={history} url={url} now={new Date()} />
    </ParentShell>
  );
}
