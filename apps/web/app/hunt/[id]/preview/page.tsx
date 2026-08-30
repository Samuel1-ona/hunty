/**
 * Preview route: /hunt/[id]/preview
 *
 * Allows creators to preview their hunt exactly as players will see it,
 * with local answer validation and no on-chain writes (#581).
 */

import type { Metadata } from 'next';
import { PreviewPageClient } from '@/components/PreviewPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Preview Hunt #${id} | Hunty`,
    description: 'Creator preview — answers are validated locally and nothing is saved.',
    robots: { index: false, follow: false },
  };
}

export default async function PreviewPage({ params }: PageProps) {
  const { id } = await params;
  const huntId = parseInt(id, 10);

  return <PreviewPageClient huntId={huntId} />;
}
