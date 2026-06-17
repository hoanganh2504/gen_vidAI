export const getConversations = () => {
  const data = localStorage.getItem("ai_video_conversations");
  if (!data) return [];

  const conversations = JSON.parse(data);

  return conversations.map((chat) => ({
    ...chat,
    messages: chat.messages.map((msg) => {
      if (msg.sender === "AI" && msg.text && typeof msg.text === "object") {
        return { sender: "AI", storyboard: msg.text };
      }
      return msg;
    }),
  }));
};

export const saveConversations = (conversations) => {
  localStorage.setItem(
    "ai_video_conversations",
    JSON.stringify(conversations)
  );
};