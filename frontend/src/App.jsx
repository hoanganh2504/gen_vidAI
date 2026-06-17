import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatArea from "./components/ChatArea";
import InputBox from "./components/InputBox";
import PreviewPanel from "./components/PreviewPanel";
import { getConversations, saveConversations } from "./utils/conversations";
import { generateStoryboard } from "./services/geminiService";

function App() {
  const storedConversations = getConversations();

  const [messages, setMessages] = useState(storedConversations[0]?.messages || []);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [conversations, setConversations] = useState(storedConversations);
  const [activeChat, setActiveChat] = useState(storedConversations[0]?.id || null);
  const [latestStoryboard, setLatestStoryboard] = useState(null);

  const createConversation = () => {
    const newChat = { id: Date.now(), title: "New Chat", messages: [] };
    const updated = [newChat, ...conversations];
    setConversations(updated);
    saveConversations(updated);
    setActiveChat(newChat.id);
    setMessages([]);
    setLatestStoryboard(null);
  };

  const handleSend = async (prompt) => {
    if (!prompt.trim()) return;

    let currentChatId = activeChat;

    if (!currentChatId) {
      const newChat = { id: Date.now(), title: prompt.slice(0, 30), messages: [] };
      const updatedChats = [newChat, ...conversations];
      setConversations(updatedChats);
      saveConversations(updatedChats);
      setActiveChat(newChat.id);
      currentChatId = newChat.id;
    }

    setLoading(true);

    const userMessage = { sender: "User", text: prompt };

    // updatedMessages chứa toàn bộ lịch sử + message mới
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    const updatedConversations = conversations.map((chat) =>
      chat.id === currentChatId
        ? { ...chat, title: prompt.slice(0, 30), messages: updatedMessages }
        : chat
    );
    setConversations(updatedConversations);
    saveConversations(updatedConversations);

    try {
      // Truyền toàn bộ lịch sử để Gemini có context
      const storyboard = await generateStoryboard(updatedMessages);

      if (storyboard && !storyboard.raw) {
        setLatestStoryboard(storyboard);
      }

      const aiMessage = { sender: "AI", storyboard };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      const finalConversations = updatedConversations.map((chat) =>
        chat.id === currentChatId ? { ...chat, messages: finalMessages } : chat
      );
      setConversations(finalConversations);
      saveConversations(finalConversations);
    } catch (error) {
      console.error(error);
      const aiMessage = { sender: "AI", text: "Failed to generate storyboard. Please try again." };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        conversations={conversations}
        setMessages={setMessages}
        setActiveChat={setActiveChat}
        activeChat={activeChat}
        createConversation={createConversation}
      />
      <div className="main-content">
        <div className="workspace">
          <Header />
          <ChatArea messages={messages} loading={loading} onPromptClick={handleSend} />
          <InputBox onSend={handleSend} loading={loading} />
        </div>
        <PreviewPanel storyboard={latestStoryboard} />
      </div>
    </div>
  );
}

export default App;