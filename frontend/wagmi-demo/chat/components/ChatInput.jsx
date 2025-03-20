import useAutosize from "../hooks/useAutosize";
import sendIcon from "../assets/images/send.png";
import Image from "next/image";

function ChatInput({ newMessage, isLoading, setNewMessage, submitNewMessage }) {
    const textareaRef = useAutosize(newMessage);

    function handleKeyDown(e) {
        if (e.keyCode === 13 && !e.shiftKey && !isLoading) {
            e.preventDefault();
            submitNewMessage();
        }
    }

    return (
        <div className="sticky bottom-0 bg-white py-2 no-bg">
            <div className="p-1.5 bg-primary-blue/35 rounded-3xl z-50 font-mono origin-bottom animate-chat duration-400">
                <div className="">
                    <textarea
                        className="block w-full max-h-[140px] py-2 px-4 pr-11 bg-white rounded-3xl resize-none placeholder:text-primary-blue placeholder:leading-4 placeholder:-translate-y-1 sm:placeholder:leading-normal sm:placeholder:translate-y-0 focus:outline-none"
                        ref={textareaRef}
                        rows="1"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        className="absolute top-1/2 -translate-y-1/2 right-3 p-1 rounded-md hover:bg-primary-blue/20"
                        onClick={submitNewMessage}
                    >
                        <div style={{ width: "42px", height: "42px", marginRight: "10px" }}>
                            <Image src={sendIcon} />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatInput;