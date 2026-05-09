import { SkillReader } from "@/components/skills/skill-reader";

export default async function SkillDetailPage({
  params,
}: Readonly<{
  params: Promise<{ skillId: string }>;
}>) {
  const { skillId } = await params;
  return <SkillReader skillId={skillId} />;
}
