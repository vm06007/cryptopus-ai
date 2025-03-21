import { useState } from "react";
import { useImmer } from "use-immer";
import { createChat, sendChatMessage } from "../api";
import { parseSSEStream } from "../utils";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";

function Chatbot({ chatMode }) {
    const [chatId, setChatId] = useState(null);
    const [messages, setMessages] = useImmer([]);
    const [newMessage, setNewMessage] = useState("");
    const [sendInfo, setSendInfo] = useState(null);

    const isLoading = messages.length && messages[messages.length - 1].loading;

    async function submitNewMessage() {
        const trimmedMessage = newMessage.trim();
        if (!trimmedMessage || isLoading) return;

        setMessages(draft => {
            draft.push({ role: "user", content: trimmedMessage });
            draft.push({ role: "assistant", content: "", sources: [], loading: true });
        });

        setNewMessage("");

        let chatIdOrNew = chatId;

        // console.log(chatId, "chatId");

        try {
            if (!chatId) {
                const { id } = await createChat();
                console.log("Chat ID:", id);
                setChatId(id);
                chatIdOrNew = id;
            }

            if (!chatMode) {
                chatMode = "ask_ai";
            }

            const jsonResponse = await sendChatMessage(
                chatIdOrNew,
                trimmedMessage,
                chatMode
            );

            if (jsonResponse.sendInfo) {
                setSendInfo(jsonResponse.sendInfo);
            } else {
                setSendInfo(null);
            }

            for await (const textChunk of parseSSEStream(jsonResponse, 500, 100)) {
                setMessages(draft => {
                    draft[draft.length - 1].content += textChunk;
                });
            }

            setMessages(draft => {
                draft[draft.length - 1].loading = false;
            });

        } catch (err) {
            console.error("Chat Error:", err);
            setMessages(draft => {
                draft[draft.length - 1].loading = false;
                draft[draft.length - 1].error = true;
            });
        }
    }

    return (
        <div className="relative grow flex flex-col gap-6 pt-6">
            {messages.length === 0 && (
                <div className="mt-3 font-urbanist text-primary-blue text-xl font-light space-y-2">
                    <p>👋 Welcome! This is ChatBot Box</p>
                </div>
            )}
            <ChatMessages
                messages={messages}
                isLoading={isLoading}
                sendInfo={sendInfo}
            />
            <ChatInput
                newMessage={newMessage}
                isLoading={isLoading}
                setNewMessage={setNewMessage}
                submitNewMessage={submitNewMessage}
            />
        </div>
    );
}

export default Chatbot;
