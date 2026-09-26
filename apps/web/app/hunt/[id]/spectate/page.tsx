import SpectatorLeaderboard from "/components/SpectatorLeaderboard";

interface PageProps {\n  params: Promise<{ id: string }>;\n}\n\nexport default async function SpectatePage({ params }: PageProps) {\n  const { id } = await params;\n  return <SpectatorLeaderboard huntId={id} />;\n}"