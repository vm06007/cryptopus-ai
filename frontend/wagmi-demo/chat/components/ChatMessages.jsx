import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import useAutoScroll from "../hooks/useAutoScroll";
import Spinner from "../components/Spinner";
import userIcon from "../assets/images/user.svg";
import errorIcon from "../assets/images/error.svg";
import Image from "next/image";
import SendTransaction from "../../components/SendTransaction";
import ContractWrite from "../../components/ContractWrite";

function parseSwapInfo(originalText) {
    // Regex captures: "SWAP_INFO:" + any braces {...} (non-greedy) until the next line.
    // This handles a single line: SWAP_INFO: { 'from_token': 'ETH', ... }
    const regex = /SWAP_INFO:\s*(\{.*?\})(?:\r?\n)?/s;
    const match = originalText.match(regex);

    if (!match) {
        return { text: originalText, swapData: null };
    }

    // Extract the portion that looks like JSON
    let jsonLike = match[1];

    // Because some responses might use single quotes, replace them with double quotes.
    // This is a naive replacement—if the content has other single quotes, handle carefully.
    jsonLike = jsonLike.replace(/'/g, '"');

    let parsedSwap;
    try {
        parsedSwap = JSON.parse(jsonLike);
    } catch (err) {
        // If it fails to parse, just ignore the SWAP_INFO
        console.error("Failed to parse SWAP_INFO:", err);
        return { text: originalText, swapData: null };
    }

    // Remove the matched line from the original text:
    const newText = originalText.replace(regex, "").trim();

    return { text: newText, swapData: parsedSwap };
}

function ChatMessages({ messages, isLoading }) {
    const scrollContentRef = useAutoScroll(isLoading);

    const isETH = (sendInfo) => {
        return sendInfo?.Token === "ETH";
    };

    return (
        <div ref={scrollContentRef} className="grow space-y-4 overflow-no">
            {messages.map(({ role, content, loading, error, sendInfo }, idx) => {
                // Detect SWAP_INFO inside the content if role is "assistant"
                let swapData = null;
                let finalContent = content;

                if (role === "assistant" && content) {
                    const { text, swapData: parsed } = parseSwapInfo(content);
                    finalContent = text;
                    swapData = parsed;
                }

                return (
                    <div
                        key={idx}
                        className={`flex items-start gap-4 py-4 px-3 rounded-xl ${
                            role === "user" ? "bg-primary-blue/10" : ""
                        }`}
                    >
                        {role === "user" && (
                            <Image
                                className="h-[26px] w-[26px] shrink-0"
                                alt="user"
                                src={userIcon}
                            />
                        )}

                        <div>
                            <div className="markdown-container">
                                {role === "assistant" ? (
                                    <>
                                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                                            {finalContent}
                                        </ReactMarkdown>
                                        {loading && (
                                            <div className="mt-2">
                                                <Spinner />
                                            </div>
                                        )}
                                        {/*
                                            If swapData was found, pass it to ContractWrite.
                                            Otherwise, use your existing sendInfo approach.
                                        */}
                                        {!loading && (
                                            <>
                                                {swapData ? (
                                                    <ContractWrite
                                                        token={swapData.to_token}
                                                        to={swapData.to_token}
                                                        amount={swapData.from_amount}
                                                    />
                                                ) : sendInfo?.Amount ? (
                                                    isETH(sendInfo) ? (
                                                        <SendTransaction
                                                            to={sendInfo.To}
                                                            amount={sendInfo.Amount}
                                                        />
                                                    ) : (
                                                        <ContractWrite
                                                            token={sendInfo.Token}
                                                            to={sendInfo.To}
                                                            amount={sendInfo.Amount}
                                                        />
                                                    )
                                                ) : null}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="whitespace-pre-line">{finalContent}</div>
                                        {loading && (
                                            <div className="mt-2">
                                                <Spinner />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {error && (
                                <div
                                    className={`flex items-center gap-1 text-sm text-error-red ${
                                        finalContent ? "mt-2" : ""
                                    }`}
                                >
                                    <Image className="h-5 w-5" alt="error" src={errorIcon} />
                                    <span>Error generating the response</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default ChatMessages;