import api from "@/lib/api";

export const fetchAssistantContext = async () => {
  const response = await api.get("/assistant/context");
  return response.data;
};

export const askAssistant = async (
  question: string,
  history: { role: "user" | "assistant"; content: string }[] = []
) => {
  const response = await api.post("/assistant/ask", { question, history });
  return response.data;
};
