import SpectatorLeaderboard from "@/components/SpectatorLeaderboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SpectatePage({ params }: PageProps) {
  const { id } = await params;
  return <SpectatorLeaderboard huntId={Number(id)} />;
}