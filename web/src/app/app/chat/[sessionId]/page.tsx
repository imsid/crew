import { ChatPanel } from "@/components/chat/chat-panel";

export default async function SessionChatPage({
  params,
}: Readonly<{
  params: Promise<{ sessionId: string }>;
}>) {
  const { sessionId } = await params;
  return <ChatPanel sessionId={sessionId} />;
}
