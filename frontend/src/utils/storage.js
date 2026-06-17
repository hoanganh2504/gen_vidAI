export const saveMessages = (messages) => {
  localStorage.setItem(
    "ai_video_messages",
    JSON.stringify(messages)
  );
};

export const loadMessages = () => {
  const data = localStorage.getItem(
    "ai_video_messages"
  );

  return data ? JSON.parse(data) : [];
};

export const clearMessages = () => {
  localStorage.removeItem(
    "ai_video_messages"
  );
};