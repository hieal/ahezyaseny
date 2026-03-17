import React, { useState, useEffect, useRef } from "react";
import { dataService } from "../services/dataService";
import { Send } from "lucide-react";

interface ViewOnlyWhatsAppChatProps {
  groupId?: string;
  isMainGroup?: boolean;
}

export function ViewOnlyWhatsAppChat({
  groupId,
  isMainGroup = false,
}: ViewOnlyWhatsAppChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;

    let isMounted = true;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const whapiMessages = await dataService.getWhatsAppMessages(groupId);
        if (!isMounted) return;

        const formattedMessages = whapiMessages
          .map((m: any) => ({
            id: m.id,
            text: m.text?.body || m.image?.caption || m.caption || "",
            sender: m.from_me ? "מערכת" : m.from_name || "אחר",
            timestamp: new Date(m.timestamp * 1000).toISOString(),
            type: m.from_me ? "me" : "other",
            image: m.type === "image" ? m.image?.link : undefined,
          }))
          .reverse();

        setMessages(formattedMessages);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [groupId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!groupId) {
    return (
      <div className="flex-1 bg-[#e5ddd5] p-4 flex items-center justify-center">
        <div className="bg-white/80 p-4 rounded-2xl text-center shadow-sm">
          <p className="text-sm font-bold text-slate-500">
            לא הוגדר מזהה קבוצה (Whapi ID)
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            פנה למנהל המערכת להגדרת הקבוצה
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 bg-[#e5ddd5] p-4 space-y-4 overflow-y-auto pb-24 scroll-smooth custom-scrollbar"
      >
        <div className="flex justify-center">
          <span className="bg-white/80 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm uppercase tracking-wider">
            הודעות אחרונות
          </span>
        </div>

        {loading && messages.length === 0 ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.type === "me" ? "items-end" : "items-start"} max-w-[85%] ${msg.type === "me" ? "ml-auto" : ""}`}
            >
              <div
                className={`p-3 rounded-2xl shadow-sm space-y-1 ${msg.type === "me" ? "bg-[#DCF8C6] rounded-tr-none" : "bg-white rounded-tl-none"}`}
              >
                <p
                  className={`text-[10px] font-black ${msg.type === "me" ? "text-emerald-700" : "text-emerald-600"}`}
                >
                  {msg.sender}
                </p>
                {msg.image && (
                  <img
                    src={msg.image}
                    className="w-full max-w-[200px] rounded-lg object-cover mb-2"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                )}
                {msg.text && (
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </p>
                )}
                <p className="text-[9px] text-slate-400 text-left mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-start max-w-[80%]">
            <div className="bg-white p-3 rounded-2xl rounded-tr-none shadow-sm space-y-1">
              <p className="text-[10px] font-black text-emerald-600">מערכת</p>
              <p className="text-sm text-slate-800">
                אין הודעות להצגה בקבוצה זו.
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100">
        <div className="bg-slate-100 p-3 rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed">
          <span className="text-sm text-slate-400 font-medium">
            {isMainGroup ? "אין לך הרשאה להקליד בקבוצה זו" : "צפייה בלבד"}
          </span>
          <Send size={18} className="text-slate-300" />
        </div>
      </div>
    </div>
  );
}
