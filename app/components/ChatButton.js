"use client";

export default function ChatButton() {
  return (
    <a
      href="https://zalo.me/84365717262"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat Admin Zalo"
      className="xenova-chat-button"
    >
      <span className="xenova-chat-bubble">
        💬
      </span>

      <span className="xenova-chat-label">
        Chat Admin
      </span>
    </a>
  );
}

const styles = `
.xenova-chat-button {
  position: fixed;
  right: 16px;
  bottom: 82px;
  z-index: 9990;

  width: 56px;
  height: 56px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background:
    linear-gradient(
      135deg,
      #1687ff,
      #075bd4
    );

  border:
    2px solid
    rgba(255,255,255,.35);

  color: #fff;
  text-decoration: none;

  box-shadow:
    0 7px 25px
    rgba(0,110,255,.40);

  animation:
    xenovaChatPulse
    2s
    infinite;
}

.xenova-chat-bubble {
  font-size: 24px;
  line-height: 1;
}

.xenova-chat-label {
  position: absolute;
  right: 66px;

  white-space: nowrap;

  padding: 7px 10px;

  border-radius: 8px;

  background: #101722;

  border:
    1px solid
    #29384d;

  color: #fff;

  font-size: 10px;
  font-weight: 800;

  opacity: 0;
  pointer-events: none;

  transition:
    opacity .2s,
    transform .2s;

  transform:
    translateX(5px);
}

.xenova-chat-button:hover
.xenova-chat-label {
  opacity: 1;
  transform:
    translateX(0);
}

@keyframes xenovaChatPulse {
  0% {
    box-shadow:
      0 7px 25px
      rgba(0,110,255,.40);
  }

  50% {
    box-shadow:
      0 7px 32px
      rgba(0,110,255,.65);
  }

  100% {
    box-shadow:
      0 7px 25px
      rgba(0,110,255,.40);
  }
}

@media (max-width: 600px) {
  .xenova-chat-button {
    right: 13px;
    bottom: 76px;
    width: 51px;
    height: 51px;
  }

  .xenova-chat-bubble {
    font-size: 22px;
  }

  .xenova-chat-label {
    display: none;
  }
}
`;

if (
  typeof document !== "undefined" &&
  !document.getElementById(
    "xenova-chat-style"
  )
) {
  const style =
    document.createElement("style");

  style.id =
    "xenova-chat-style";

  style.textContent = styles;

  document.head.appendChild(style);
}
