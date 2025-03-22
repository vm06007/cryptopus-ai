import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import Button from "../../components/Button";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import useAutoScroll from "../hooks/useAutoScroll";
import Spinner from "../components/Spinner";
import userIcon from "../assets/images/user.svg";
import errorIcon from "../assets/images/error.svg";
import Image from "next/image";
import SendTransaction from "../../components/SendTransaction";
import ContractWrite from "../../components/ContractWrite";

function parseSwapInfo(originalText) {
    const regex = /SWAP_INFO:\s*(\{.*?\})(?:\r?\n)?/s;
    const match = originalText.match(regex);

    if (!match) {
        return { text: originalText, swapData: null };
    }

    let jsonLike = match[1];
    jsonLike = jsonLike.replace(/'/g, '"');

    let parsedSwap;
    try {
        parsedSwap = JSON.parse(jsonLike);
    } catch (err) {
        console.error("Failed to parse SWAP_INFO:", err);
        return { text: originalText, swapData: null };
    }

    const newText = originalText.replace(regex, "").trim();
    return { text: newText, swapData: parsedSwap };
}

/**
 * Detects a triple-backtick code fence labeled `json` and extracts the JSON.
 * Then removes the code fence from the text.
 */
function parseJsonCodeBlock(originalText) {
    // Matches ```json\n...some JSON...\n```
    // The ([\s\S]*?) part captures everything (including newlines) non-greedily.
    const codeBlockRegex = /```json\s*([\s\S]*?)```/i;
    const match = originalText.match(codeBlockRegex);

    if (!match) {
        return { text: originalText, codeData: null };
    }

    const rawJson = match[1].trim();

    let parsedJson;
    try {
        parsedJson = JSON.parse(rawJson);
    } catch (err) {
        console.error("Failed to parse JSON code block:", err);
        return { text: originalText, codeData: null };
    }

    // Remove the entire code fence from the text
    const newText = originalText.replace(codeBlockRegex, "").trim();
    return { text: newText, codeData: parsedJson };
}


function ChatMessages({ messages, isLoading }) {
    const scrollContentRef = useAutoScroll(isLoading);

    const isETH = (sendInfo) => {
        return sendInfo?.Token === "ETH";
    };

    // Custom renderer for code blocks with syntax highlighting
    const components = {
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
                <SyntaxHighlighter
                    style={vs}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                >
                    {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        }
    };

    return (
        <div ref={scrollContentRef} className="grow space-y-4 overflow-no">
            {messages.map(({ role, content, loading, error, sendInfo, executePending }, idx) => {
                let swapData = null;
                let codeData = null;
                let finalContent = content;

                if (role === "assistant" && content) {
                    // 1. Remove SWAP_INFO if present
                    const swapResult = parseSwapInfo(finalContent);
                    finalContent = swapResult.text;
                    swapData = swapResult.swapData;

                    // 2. Detect and remove ```json code block
                    const jsonResult = parseJsonCodeBlock(finalContent);
                    finalContent = jsonResult.text;
                    codeData = jsonResult.codeData;

                    // Now, finalContent is stripped of SWAP_INFO and any ```json code block.
                    // codeData holds the JSON object from the code fence if needed.
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
                                        <ReactMarkdown
                                            remarkPlugins={[remarkBreaks, remarkGfm]}
                                            components={components}
                                        >
                                            {finalContent}
                                        </ReactMarkdown>
                                        {loading && (
                                            <div className="mt-2">
                                                <Spinner />
                                            </div>
                                        )}

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
                                                {executePending && (
                                                    <>
                                                        <div className="text-primary-blue mt-2">
                                                            <Button onClick_={() => {
                                                                console.log("Executing pending transactions...");
                                                            }} cta="Invoke Safe Execution" />
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {/* codeData is the JSON extracted from ```json code fence */}
                                        {/* If you need to display or process it, you can do so here */}
                                    </>
                                ) : (
                                    <>
                                        <div className="whitespace-pre-line">
                                            {finalContent}
                                        </div>
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
                                    <Image
                                        className="h-5 w-5"
                                        alt="error"
                                        src={errorIcon}
                                    />
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
