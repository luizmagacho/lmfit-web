import { publicHttp } from "@/lib/publicHttp";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export async function sendPublicChatMessage(
  message: string,
  history: ChatMessage[],
): Promise<string> {
  const { data } = await publicHttp.post<{ reply: string }>("/public/chat", {
    message,
    history,
  });
  return data.reply;
}
