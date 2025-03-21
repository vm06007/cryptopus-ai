import React, {
    useState,
    forwardRef,
    useImperativeHandle
} from "react";
import { useImmer } from "use-immer";
import { createChat, sendChatMessage } from "../api";
import { parseSSEStream } from "../utils";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";

/**
 * ChatbotInner is the inner component that we'll wrap with forwardRef
 * to expose a submitCustomMessage() method.
 */
function ChatbotInner({ chatMode }, ref) {
    const [chatId, setChatId] = useState(null);
    const [messages, setMessages] = useImmer([]);
    const [newMessage, setNewMessage] = useState("");

    const isLoading =
        messages.length && messages[messages.length - 1].loading;

    /**
     * This function can either use the user’s typed message (newMessage) or
     * a custom string (optionalMsg), such as for “Examine Transaction.”
     */
    async function submitNewMessage(optionalMsg) {
        const trimmedMessage = optionalMsg
            ? optionalMsg
            : newMessage.trim();

        // If there's nothing to send, or if we are still waiting on a response,
        // bail out.
        if (!trimmedMessage || isLoading) return;

        const actualMode = chatMode || "ask_ai";

        // Add the user message, plus a placeholder for the assistant response
        setMessages((draft) => {
            draft.push({
                role: "user",
                content: trimmedMessage
            });
            draft.push({
                role: "assistant",
                content: "",
                sources: [],
                loading: true
            });
        });

        // If we are using the normal typed flow, clear the message
        if (!optionalMsg) {
            setNewMessage("");
        }

        let chatIdOrNew = chatId;
        try {
            if (!chatId) {
                const { id } = await createChat();
                setChatId(id);
                chatIdOrNew = id;
            }

            const jsonResponse = await sendChatMessage(
                chatIdOrNew,
                trimmedMessage,
                actualMode
            );

            // If there's a "sendInfo" in the response, attach it
            if (jsonResponse.sendInfo) {
                setMessages((draft) => {
                    draft[draft.length - 1].sendInfo =
                        jsonResponse.sendInfo;
                });
            }

            // Parse SSE response in chunks
            for await (const textChunk of parseSSEStream(jsonResponse, 250, 100)) {
                setMessages((draft) => {
                    draft[draft.length - 1].content += textChunk;
                });
            }

            // Mark last message as fully loaded
            setMessages((draft) => {
                draft[draft.length - 1].loading = false;
            });
        } catch (err) {
            console.error("Chat Error:", err);
            setMessages((draft) => {
                draft[draft.length - 1].loading = false;
                draft[draft.length - 1].error = true;
            });
        }
    }

    /**
     * Expose a custom method to the parent via ref:
     *   chatbotRef.current.submitCustomMessage( ... )
     */
    useImperativeHandle(ref, () => ({
        submitCustomMessage: (message) => {
            submitNewMessage(message);
        }
    }));

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
            />
            <ChatInput
                newMessage={newMessage}
                isLoading={isLoading}
                setNewMessage={setNewMessage}
                submitNewMessage={() => submitNewMessage()}
            />
        </div>
    );
}

/**
 * Wrap ChatbotInner in forwardRef so we can call the method from a parent component.
 */
const Chatbot = forwardRef(ChatbotInner);
export default Chatbot;
