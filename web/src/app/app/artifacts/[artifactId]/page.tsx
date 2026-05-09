import { ArtifactReader } from "@/components/artifacts/artifact-reader";

export default async function ArtifactPage({
  params,
}: Readonly<{
  params: Promise<{ artifactId: string }>;
}>) {
  const { artifactId } = await params;
  return <ArtifactReader artifactId={artifactId} />;
}
