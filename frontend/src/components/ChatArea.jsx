import { motion } from "framer-motion";
import { useRef, useEffect } from "react";
import WelcomeScreen from "./WelcomeScreen";

function StoryboardMessage({ storyboard }) {
  if (!storyboard || storyboard.title === "Parse Error" || storyboard.title === "Generation Failed") {
    return (
      <div className="message ai">
        <p style={{ color: "#f87171", fontSize: 13 }}>
          ⚠ {storyboard?.raw || "Failed to generate storyboard."}
        </p>
      </div>
    );
  }

  return (
    <div className="message ai">
      <div className="storyboard-header">
        <h3>{storyboard.title}</h3>
        <span className="storyboard-badge">{storyboard.scenes?.length || 0} scenes</span>
      </div>
      <div className="storyboard-meta">
        {storyboard.style && (
          <span><strong>Style</strong> {storyboard.style}</span>
        )}
        {storyboard.duration && (
          <span><strong>Duration</strong> {storyboard.duration}</span>
        )}
      </div>
      {storyboard.scenes?.map((scene) => (
        <div key={scene.scene} className="scene-card">
          <div className="scene-num">Scene {scene.scene}</div>
          {scene.description && (
            <div className="scene-desc">{scene.description}</div>
          )}
          {scene.imagePrompt && (
            <>
              <div className="scene-section-label">Image Prompt</div>
              <div className="scene-section-val">{scene.imagePrompt}</div>
            </>
          )}
          {scene.voiceover && (
            <>
              <div className="scene-section-label">Voiceover</div>
              <div className="scene-section-val">"{scene.voiceover}"</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function ChatArea({ messages, loading, onPromptClick }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0) {
    return <WelcomeScreen onPromptClick={onPromptClick} />;
  }

  return (
    <div className="chat-area">
      {messages.map((msg, index) => {
        if (msg.sender === "User") {
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="message user"
            >
              {msg.text}
            </motion.div>
          );
        }

        // Xác định storyboard từ msg.storyboard hoặc msg.text (legacy)
        const storyboard =
          msg.storyboard ||
          (msg.text && typeof msg.text === "object" ? msg.text : null);

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {storyboard ? (
              <StoryboardMessage storyboard={storyboard} />
            ) : (
              <div className="message ai">
                {String(msg.text ?? "")}
              </div>
            )}
          </motion.div>
        );
      })}

      {loading && (
        <div className="message ai">
          <div className="loading-dots">
            <span>●</span><span>●</span><span>●</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

export default ChatArea;