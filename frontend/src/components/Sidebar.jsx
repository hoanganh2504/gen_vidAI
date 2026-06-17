import { Menu, Plus, FolderOpen, Trash2 } from "lucide-react";
import { clearMessages } from "../utils/storage";

function Sidebar({ collapsed, setCollapsed, conversations, setMessages, setActiveChat, activeChat, createConversation }) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button className="menu-btn" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar">
        <Menu size={18} />
      </button>

      {!collapsed && (
        <>
          <div className="logo-area">
            <h2>AI <span>Studio</span></h2>
            <p>Powered by Gemini</p>
          </div>

          <button className="new-project" onClick={createConversation}>
            <Plus size={16} />
            New Chat
          </button>

          <div className="history-title">Conversations</div>

          <div className="sidebar-history">
            {conversations.map((chat) => (
              <div
                key={chat.id}
                className={`project-item ${chat.id === activeChat ? "active" : ""}`}
                onClick={() => {
                  setActiveChat(chat.id);
                  setMessages(chat.messages);
                }}
              >
                <FolderOpen size={14} style={{ flexShrink: 0 }} />
                <span>{chat.title}</span>
              </div>
            ))}
          </div>

          <button
            className="clear-btn"
            onClick={() => {
              clearMessages();
              window.location.reload();
            }}
          >
            <Trash2 size={15} />
            Clear History
          </button>
        </>
      )}
    </aside>
  );
}

export default Sidebar;