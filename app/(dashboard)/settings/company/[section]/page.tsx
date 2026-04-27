import { redirect } from 'next/navigation';

export default async function CompanySettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  redirect(`/company-settings/${section}`);
}

