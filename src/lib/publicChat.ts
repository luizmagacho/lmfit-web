import { publicHttp } from "@/lib/publicHttp";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatCartLine = {
  variantId: string;
  productName: string;
  quantity: number;
  isOrder?: boolean;
};

export type ChatCartAction = {
  type: "add_to_cart";
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  color?: string;
  size?: string;
  // API formats monetary fields as pt-BR strings (e.g. "299,90"); parsed before use.
  priceRetail: number | string;
  priceWholesale: number | string | null;
  minWholesaleQty: number;
  imageUrl: string | null;
  quantity: number;
  isOrder: boolean;
};

export type ChatRemoveAction = {
  type: "remove_from_cart";
  variantId: string;
  isOrder: boolean;
  quantity: number | null;
};

export type ChatLeadAction = {
  type: "lead_request";
  productDescription: string;
  customerName: string;
  customerPhone: string;
};

export type ChatAction = ChatCartAction | ChatRemoveAction | ChatLeadAction;

export type ChatReplyResult = {
  reply: string;
  actions: ChatAction[];
};

export async function sendPublicChatMessage(
  message: string,
  history: ChatMessage[],
  cartLines: ChatCartLine[] = [],
): Promise<ChatReplyResult> {
  const { data } = await publicHttp.post<ChatReplyResult>("/public/chat", {
    message,
    history,
    cartLines,
  });
  return data;
}
