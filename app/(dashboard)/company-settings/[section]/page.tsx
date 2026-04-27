import { notFound } from 'next/navigation';
import { CompanySettingsContent, type CompanySettingsSection } from '../../settings/company/CompanySettingsContent';
import { getCompanySettingsData } from '../../settings/company/_lib/getCompanySettingsData';

const COMPANY_SETTINGS_SECTIONS: CompanySettingsSection[] = [
  'overview',
  'members',
  'workspaces',
  'api-access',
  'webhooks',
  'billing',
  'usage',
  'security',
  'data-retention',
  'integrations',
  'notifications',
  'compliance',
  'danger-zone',
];

export default async function CompanySettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!COMPANY_SETTINGS_SECTIONS.includes(section as CompanySettingsSection)) notFound();

  const data = await getCompanySettingsData();

  return <CompanySettingsContent section={section as CompanySettingsSection} {...data} />;
}

