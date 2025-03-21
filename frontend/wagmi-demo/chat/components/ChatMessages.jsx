import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import useAutoScroll from "../hooks/useAutoScroll";
import Spinner from "../components/Spinner";
import userIcon from "../assets/images/user.svg";
import errorIcon from "../assets/images/error.svg";
import Image from "next/image";
import SendTransaction from "../../components/SendTransaction";
import ContractWrite from "../../components/ContractWrite";

function ChatMessages({ messages, isLoading }) {
    const scrollContentRef = useAutoScroll(isLoading);

    const isETH = (sendInfo) => {
        return sendInfo?.Token === "ETH";
    };

    return (
        <div ref={scrollContentRef} className="grow space-y-4">
            {messages.map(({ role, content, loading, error, sendInfo }, idx) => (
                <div
                    key={idx}
                    className={`flex items-start gap-4 py-4 px-3 rounded-xl ${
                        role === "user" ? "bg-primary-blue/10" : ""
                    }`}
                >
                    {role === "user" && (
                        <Image className="h-[26px] w-[26px] shrink-0" alt="user" src={userIcon} />
                    )}

                    <div>
                        <div className="markdown-container">
                            {role === "assistant" ? (
                                <>
                                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                                        {content}
                                    </ReactMarkdown>

                                    {loading && (
                                        <div className="mt-2">
                                            <Spinner />
                                        </div>
                                    )}

                                    {/* Only show transaction buttons for messages that have sendInfo */}
                                    {!loading && sendInfo?.Amount && (
                                        <>
                                            {isETH(sendInfo) ? (
                                                <SendTransaction to={sendInfo.To} amount={sendInfo.Amount} />
                                            ) : (
                                                <ContractWrite token={sendInfo.Token} to={sendInfo.To} amount={sendInfo.Amount} />
                                            )}
                                        </>
                                    )}
                                </>
                            ) : (
                                // For user messages or others
                                <>
                                    <div className="whitespace-pre-line">
                                        {content}
                                    </div>
                                    {loading && (
                                        <div className="mt-2">
                                            <Spinner />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Error handling */}
                        {error && (
                            <div
                                className={`flex items-center gap-1 text-sm text-error-red ${
                                    content ? "mt-2" : ""
                                }`}
                            >
                                <Image className="h-5 w-5" alt="error" src={errorIcon} />
                                <span>Error generating the response</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default ChatMessages;