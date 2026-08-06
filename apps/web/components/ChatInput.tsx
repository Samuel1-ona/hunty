import { Send, Smile } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@hunty/ui";
import { Input } from "@/components/ui/input";

const commonEmojis = [
  "😀",
  "😂",
  "😍",
  "🤔",
  "👍",
  "👎",
  "❤️",
  "🔥",
  "🎉",
  "🙌",
  "😎",
  "🤣",
  "😢",
  "😡",
  "👏",
  "🙏",
  "🤩",
  "😜",
  "🤗",
  "😇",
];

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
}) => {
  const [message, setMessage] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setEmojiPickerOpen(false);
  };

  return (
    <div className="flex items-center gap-2 p-3 border-t border-slate-200 dark:border-slate-700">
      <div className="flex-1">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="rounded-full"
        />
      </div>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
          type="button"
        >
          <Smile className="h-5 w-5" />
        </Button>
        {emojiPickerOpen && (
          <div className="absolute right-0 bottom-full mb-2 w-80 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-lg z-50">
            <div className="grid grid-cols-10 gap-2">
              {commonEmojis.map((emoji, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="icon"
                  onClick={() => insertEmoji(emoji)}
                  className="h-8 w-8"
                  type="button"
                >
                  <span className="text-lg">{emoji}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};
 