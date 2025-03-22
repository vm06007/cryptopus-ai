"use client";

import Button from "components/Button";
import Balance from "components/Balance";
import { useState, useEffect, useRef } from "react";
import Chatbot from "chat/components/Chatbot";
import { getSafeWallets, getPendingTransactions } from "chat/api";
import CreateSafeWallet from "./CreateSafeWallet";

/*import BlockNumber from "components/BlockNumber";
import ContractEvent from "components/ContractEvent";
import ContractRead from "components/ContractRead";
import ContractReads from "components/ContractReads";
import ContractWrite from "components/ContractWrite";
import EnsAddress from "components/EnsAddress";
import EnsAvatar from "components/EnsAvatar";
import EnsName from "components/EnsName";
import EnsResolver from "components/EnsResolver";
import FeeData from "components/FeeData";
import PublicClient from "components/PublicClient";
import SendTransaction from "components/SendTransaction";
import SignMessage from "components/SignMessage";
import SignTypedData from "components/SignTypedData";
import Signer from "components/Signer";
import SwitchNetwork from "components/SwitchNetwork";
import Token from "components/Token";
import Transaction from "components/Transaction";
import WaitForTransaction from "components/WaitForTransaction";
import WalletClient from "components/WalletClient";
import WatchPendingTransactions from "components/WatchPendingTransactions";
*/
import { shorten } from "lib/utils";
import Image from "next/image";
import { useAccount, useDisconnect } from "wagmi";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";

import logo from "../../chat/assets/images/octopus.svg";

const MonoLabel = ({ label }: { label: string }) => {
    return <span className="rounded-xl px-0 py-1 font-mono">{label}</span>;
};

const HandleCreateSafe = () => {
    console.log("Create new Safe wallet");
};

/**
 * Component: Lists Safe wallets for a given address
 */
const SafeWalletsList = ({
    address,
    onSelectSafe
}: {
    address: string;
    onSelectSafe: (safeAddress: string, view: string) => void;
}) => {
    const [safeWallets, setSafeWallets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchSafeWallets = async () => {
            if (!address) return;

            setLoading(true);
            try {
                const data = await getSafeWallets(address);
                console.log(data, 'data');
                setSafeWallets(data.safes || []);
                setError("");
            } catch (err) {
                console.error("Failed to fetch safe wallets:", err);
                setSafeWallets([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSafeWallets();
    }, [address]);

    if (loading) {
        return <div className="mt-4 p-2">Loading your Safe wallets...</div>;
    }

    if (error) {
        return <div className="mt-4 p-2 text-red-500">{error}</div>;
    }

    if (safeWallets.length === 0 && !loading) {
        return (
            <>
            <div className="mt-4 p-2">
                No Safe wallets found for this address. Consider to create one
            </div>
            <CreateSafeWallet />
            </>
        )
    }

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-0">
                <h2 className="text-xl font-bold mb-1">Your Safe Wallets</h2>
            </div>
            {safeWallets.length === 0 && !loading ? (
                <div className="mt-4 p-2">No Safe wallets found for this address.</div>
            ) : (
                <div className="space-y-2">
                    {safeWallets.map((safeAddress, index) => (
                        <div
                            key={index}
                            className="items-center justify-between bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:border-gray-300 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 flex-shrink-0">
                                    <Image
                                        src="https://app.safe.global/images/safe-logo-green.png"
                                        alt="Safe Wallet"
                                        width={32}
                                        height={32}
                                    />
                                </div>
                                <div>
                                    <MonoLabel label={shorten(safeAddress)} />
                                </div>
                                <button
                                    title="Open wallet in new tab"
                                    className="hover:bg-gray-100 p-2 rounded-full"
                                    onClick={() =>
                                        window.open(
                                            `https://app.safe.global/home?safe=${safeAddress}`,
                                            "_blank"
                                        )
                                    }
                                >
                                    🔗
                                </button>
                            </div>
                            <div className="flex gap-2 items-center" />
                            <div className="flex gap-2 items-center inline">
                                <button
                                    title="Integrate Octopus AI"
                                    className="gap-2 flex hover:bg-gray-100 p-2 rounded-full"
                                    onClick={() =>
                                        onSelectSafe(safeAddress, "ai_keys")
                                    }
                                >
                                    <span>🔑</span>
                                    <span>AI Keys Permission</span>
                                </button>
                                <button
                                    title="Show unexecuted transactions"
                                    className="gap-2 flex hover:bg-gray-100 p-2 rounded-full"
                                    onClick={() =>
                                        onSelectSafe(safeAddress, "queue")
                                    }
                                >
                                    <span>🖊️</span>
                                    <span>Transaction Queue</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {/*<Button
                        cta="Create New Safe With AI Assistant!"
                        onClick_={HandleCreateSafe}
                    />*/}
                </div>
            )}
        </div>
    );
};

/**
 * Component: AIKeysPanel - a mock of permissions UI
 */
const AIKeysPanel = ({ safeAddress }: { safeAddress: string }) => {
    const [canExecute, setCanExecute] = useState(false);
    const [autoReject, setAutoReject] = useState(false);
    const [autoExecute, setAutoExecute] = useState(false);

    const handleExecuteChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const isChecked = e.target.checked;
        setCanExecute(isChecked);
        if (!isChecked) {
            setAutoReject(false);
            setAutoExecute(false);
        }
    };

    const handleAutoRejectChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setAutoReject(e.target.checked);
    };

    const handleAutoExecuteChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setAutoExecute(e.target.checked);
    };

    return (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h2 className="text-xl font-bold mb-3">
                AI Keys Permission for Safe
            </h2>
            <div className="mb-4">
                <MonoLabel label={shorten(safeAddress)} />
            </div>
            <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                    <span>Allow AI to scan transactions</span>
                    <input
                        type="checkbox"
                        className="h-5 w-5"
                        defaultChecked
                    />
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                    <span>Allow AI to sign transactions</span>
                    <input
                        type="checkbox"
                        className="h-5 w-5"
                        defaultChecked
                    />
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                    <span>Allow AI to execute transactions</span>
                    <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={canExecute}
                        onChange={handleExecuteChange}
                    />
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                    <span className={!canExecute ? "text-gray-400" : ""}>
                        Auto-reject malicious transactions
                    </span>
                    <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={autoReject}
                        onChange={handleAutoRejectChange}
                        disabled={!canExecute}
                        style={{ opacity: !canExecute ? 0.5 : 1 }}
                    />
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                    <span className={!canExecute ? "text-gray-400" : ""}>
                        Auto-execute non-malicious transactions
                    </span>
                    <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={autoExecute}
                        onChange={handleAutoExecuteChange}
                        disabled={!canExecute}
                        style={{ opacity: !canExecute ? 0.5 : 1 }}
                    />
                </div>
            </div>
            <div className="flex mt-4 gap-1">
                <Button
                    cta="Add AI"
                    onClick_={() =>
                        console.log("Saving AI permissions for", safeAddress)
                    }
                />
                <Button
                    cta="Save Permissions"
                    onClick_={() =>
                        console.log("Saving AI permissions for", safeAddress)
                    }
                />
            </div>
        </div>
    );
};

/**
 * Helper function to display "time ago"
 */
const formatTimeAgo = (date: string) => {
    const now = new Date();
    const txDate = new Date(date);
    const diffInMs = now.getTime() - txDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
        const minutes = Math.floor(diffInMs / (1000 * 60));
        return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
        const days = Math.floor(diffInHours / 24);
        return `${days} day${days !== 1 ? "s" : ""} ago`;
    }
};

/**
 * QueuePanel: Fetch and display Safe pending transactions.
 * Accepts onExamineTransaction to handle the "Examine Transaction" click.
 */
const QueuePanel = ({
    safeAddress,
    onExamineTransaction
}: {
    safeAddress: string;
    onExamineTransaction?: (tx: any) => void;
}) => {
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const tokenAddresses = {
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": {
            symbol: "USDC",
            decimals: 6
        },
        "0xdAC17F958D2ee523a2206206994597C13D831ec7": {
            symbol: "USDT",
            decimals: 6
        },
        "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": {
            symbol: "WBTC",
            decimals: 8
        },
        "0x6B175474E89094C44Da98b954EedeAC495271d0F": {
            symbol: "DAI",
            decimals: 18
        }
    };

    const weiToEth = (weiValue: any) => {
        if (!weiValue) return "0 ETH";
        const ethValue = parseFloat(weiValue) / 1e18;
        return `${ethValue.toFixed(
            ethValue < 0.0001 ? 8 : 4
        )} ETH`;
    };

    const formatTokenValue = (value: any, decimals: number) => {
        if (!value) return "0";
        const formattedValue =
            parseFloat(value) / Math.pow(10, decimals);
        return formattedValue.toLocaleString(undefined, {
            maximumFractionDigits:
                formattedValue < 0.0001 ? 8 : 4
        });
    };

    const getTransactionInfo = (tx: any) => {
        let txInfo = {
            type: "Transaction",
            description: "Contract interaction",
            displayValue: ""
        };

        // ETH Transfer
        if (tx.value && tx.value !== "0") {
            txInfo.type = "ETH Transfer";
            txInfo.description = `Send ${weiToEth(tx.value)} to ${shorten(
                tx.to
            )}`;
            txInfo.displayValue = weiToEth(tx.value);
        }

        // If there's dataDecoded, we can check the method/params
        if (tx.dataDecoded) {
            const { method, parameters } = tx.dataDecoded;

            if (method === "transfer") {
                const toAddress = parameters.find(
                    (p: any) => p.name === "to"
                )?.value;
                const value = parameters.find(
                    (p: any) => p.name === "value"
                )?.value;

                const tokenInfo =
                    tokenAddresses[
                        tx.to as keyof typeof tokenAddresses
                    ] || { symbol: "Token", decimals: 18 };
                const formattedValue = formatTokenValue(
                    value,
                    tokenInfo.decimals
                );

                txInfo.type = `${tokenInfo.symbol} Transfer`;
                txInfo.description = `Transfer ${formattedValue} ${
                    tokenInfo.symbol
                } to ${shorten(toAddress)}`;
                txInfo.displayValue = `${formattedValue} ${
                    tokenInfo.symbol
                }`;
            } else if (method === "approve") {
                const spenderAddress = parameters.find(
                    (p: any) => p.name === "spender"
                )?.value;
                const value = parameters.find(
                    (p: any) => p.name === "value"
                )?.value;

                const tokenInfo =
                    tokenAddresses[
                        tx.to as keyof typeof tokenAddresses
                    ] || { symbol: "Token", decimals: 18 };
                const formattedValue = formatTokenValue(
                    value,
                    tokenInfo.decimals
                );

                txInfo.type = `${tokenInfo.symbol} Approval`;
                txInfo.description = `Approve ${
                    spenderAddress ? shorten(spenderAddress) : "address"
                } to spend ${formattedValue} ${tokenInfo.symbol}`;
            } else {
                txInfo.type =
                    method.charAt(0).toUpperCase() + method.slice(1);
                txInfo.description = `Call ${method} on ${shorten(tx.to)}`;
            }
        }

        return txInfo;
    };

    useEffect(() => {
        const fetchPendingTransactions = async () => {
            if (!safeAddress) return;

            setLoading(true);
            try {
                const data = await getPendingTransactions(safeAddress);
                setPendingTransactions(data.results || []);
                setError("");
            } catch (err) {
                console.error(
                    "Failed to fetch pending transactions:",
                    err
                );
                setError("Failed to load pending transactions");
            } finally {
                setLoading(false);
            }
        };

        fetchPendingTransactions();
    }, [safeAddress]);

    if (loading) {
        return (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h2 className="text-xl font-bold mb-3">
                    Transaction Queue
                </h2>
                <div className="mb-4">
                    <MonoLabel label={shorten(safeAddress)} />
                </div>
                <div className="p-4 text-center">
                    Loading pending transactions...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h2 className="text-xl font-bold mb-3">
                    Transaction Queue
                </h2>
                <div className="mb-4">
                    <MonoLabel label={shorten(safeAddress)} />
                </div>
                <div className="p-4 text-center text-red-500">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h2 className="text-xl font-bold mb-3">
                Transaction Queue
            </h2>
            <div className="mb-4">
                <MonoLabel label={shorten(safeAddress)} />
            </div>
            {pendingTransactions.length === 0 ? (
                <div className="p-4 text-center">
                    No pending transactions found.
                </div>
            ) : (
                <div className="space-y-3">
                    {pendingTransactions.map((tx: any, index) => {
                        const txInfo = getTransactionInfo(tx);

                        return (
                            <div
                                key={index}
                                className="p-3 border rounded-md bg-gray-50"
                            >
                                <div className="flex justify-between">
                                    <span className="font-medium">
                                        {txInfo.type}
                                    </span>
                                    <span className="text-gray-500">
                                        {tx.status || "Pending"}
                                    </span>
                                </div>
                                <div className="mt-1 text-sm">
                                    <p className="font-medium">
                                        {txInfo.description}
                                    </p>
                                    <p>
                                        To:{" "}
                                        <span className="font-mono">
                                            {shorten(tx.to)}
                                        </span>
                                    </p>
                                    {tx.value && tx.value !== "0" && (
                                        <p>
                                            Amount: {weiToEth(tx.value)}
                                        </p>
                                    )}
                                    <p>
                                        Created:{" "}
                                        {formatTimeAgo(
                                            tx.submissionDate ||
                                                new Date().toString()
                                        )}
                                    </p>
                                    <p>
                                        Confirmations:{" "}
                                        {tx.confirmations.length || 0}/
                                        {tx.confirmationsRequired}
                                    </p>
                                    {tx.confirmations.length > 0 && (
                                        <div className="mt-1">
                                            <p className="text-xs text-gray-500">
                                                Confirmed by:
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {tx.confirmations.map(
                                                    (
                                                        confirmation: any,
                                                        idx: any
                                                    ) => (
                                                        <span
                                                            key={idx}
                                                            className="text-xs bg-gray-200 rounded px-1 py-0.5 font-mono"
                                                        >
                                                            {shorten(
                                                                confirmation.owner
                                                            )}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 flex gap-1">
                                    <Button
                                        cta="Examine Transaction"
                                        onClick_={() => {
                                            // Use callback if provided
                                            onExamineTransaction?.(tx);
                                        }}
                                    />
                                    {tx.confirmations.length <
                                    tx.confirmationsRequired ? (
                                        <Button
                                            cta="Confirm Transaction"
                                            onClick_={() =>
                                                console.log(
                                                    "Signing transaction",
                                                    tx.safeTxHash
                                                )
                                            }
                                        />
                                    ) : (
                                        <Button
                                            cta="Execute Transaction"
                                            onClick_={() =>
                                                console.log(
                                                    "Executing transaction",
                                                    tx.safeTxHash
                                                )
                                            }
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/**
 * Main Home component (page)
 */
export default function Home() {
    // Privy
    const {
        ready,
        user,
        authenticated,
        login,
        connectWallet,
        logout,
        linkWallet
    } = usePrivy();
    const { wallets, ready: walletsReady } = useWallets();

    // WAGMI
    const { address, isConnected, isConnecting, isDisconnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { setActiveWallet } = useSetActiveWallet();

    const [currentMode, setCurrentMode] = useState("ask_ai");
    const [selectedSafe, setSelectedSafe] = useState("");
    const [safeView, setSafeView] = useState("");

    /**
     * We create a ref to call Chatbot's method from here.
     */
    const chatbotRef = useRef<{ submitCustomMessage: (message: string) => void } | null>(null);

    const handleSelectSafe = (safeAddress: string, view: string) => {
        setSelectedSafe(safeAddress);
        setSafeView(view);
    };

    if (!ready) {
        return null;
    }

    return (
        <>
            <main className="min-h-screen p-4 text-slate-800 bg-mamo trifecta-bg">
                <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 flexer">
                    {/* LEFT COLUMN */}
                    <div className="border-1 flex flex-col items-start gap-2 rounded border border-black bg-slate-100 p-3 vh-100">
                        <div className="sticky">
                            <div className="flex items-center gap-4 mb-4">
                                <Image
                                    src={logo}
                                    alt="Octopus AI"
                                    width={40}
                                />
                                <h1 className="font-urbanist text-[1.65rem] font-semibold">
                                    Octopus AI
                                </h1>
                            </div>

                            {ready && !authenticated && (
                                <>
                                    <div className="flex items-center gap-4 full-width">
                                        <Button
                                            onClick_={login}
                                            cta="Login with Privy"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4 full-width">
                                        <Button
                                            onClick_={connectWallet}
                                            cta="Connect Wallet"
                                        />
                                    </div>
                                </>
                            )}

                            {walletsReady &&
                                wallets.map((wallet) => (
                                    <div
                                        key={wallet.address}
                                        className="flex min-w-full flex-row flex-wrap items-center justify-between gap-2 bg-slate-50 p-4 full-width"
                                    >
                                        <div>
                                            <MonoLabel
                                                label={shorten(
                                                    wallet.address
                                                )}
                                            />
                                        </div>
                                        <Button
                                            cta="Make Active"
                                            onClick_={() => {
                                                setActiveWallet(wallet);
                                            }}
                                        />
                                    </div>
                                ))}

                            {ready && authenticated && (
                                <>
                                    <p className="mt-2">
                                        You are logged in with privy.
                                    </p>
                                    <Button
                                        onClick_={connectWallet}
                                        cta="Connect another wallet"
                                    />
                                    <Button
                                        onClick_={linkWallet}
                                        cta="Link another wallet"
                                    />
                                    <textarea
                                        value={JSON.stringify(
                                            wallets,
                                            null,
                                            2
                                        )}
                                        className="mt-2 w-full rounded-md bg-slate-700 p-4 font-mono text-xs text-slate-50 sm:text-sm"
                                        rows={JSON.stringify(
                                            wallets,
                                            null,
                                            2
                                        ).split("\n").length}
                                        disabled
                                    />
                                    <br />
                                    <textarea
                                        value={JSON.stringify(user, null, 2)}
                                        className="mt-2 w-full rounded-md bg-slate-700 p-4 font-mono text-xs text-slate-50 sm:text-sm"
                                        rows={JSON.stringify(
                                            user,
                                            null,
                                            2
                                        ).split("\n").length}
                                        disabled
                                    />
                                    <br />
                                    <Button
                                        onClick_={logout}
                                        cta="Logout from Privy"
                                    />
                                </>
                            )}

                            {/* SAFE WALLETS LIST */}
                            {address && currentMode === "safe" && (
                                <SafeWalletsList
                                    address={address}
                                    onSelectSafe={handleSelectSafe}
                                />
                            )}
                        </div>
                    </div>

                    {/* MIDDLE COLUMN / CHATBOT */}
                    <div className="flex flex-col min-h-full w-full max-w-3xl mx-auto px-4">
                        <header className="sticky top-0 shrink-0 z-20 super">
                            <div className="flex flex-col h-full w-full gap-1 pt-4 pb-2 bg-mamo flexing mode-selector">
                                <div
                                    onClick={() => {
                                        setCurrentMode("ask_ai");
                                    }}
                                    className="flex align-middle items-center gap-2 justify-around px-2 py-1 border-[1px] border-gray-400 bg-white rounded-full hover:bg-primary cursor-default select-none"
                                >
                                    <div className="min-w-5 max-w-7 h-8 aspect-square pointer-events-none">
                                        <Image
                                            src="https://cdn-icons-png.flaticon.com/512/8021/8021762.png"
                                            width={40}
                                            height={40}
                                            alt="Safe AI"
                                        />
                                    </div>
                                    <p className="text-lg align-baseline">
                                        Basic
                                    </p>
                                </div>
                                <div
                                    onClick={() => {
                                        setCurrentMode("trade");
                                    }}
                                    className="flex align-middle items-center gap-2 justify-around px-2 py-1 border-[1px] border-gray-400 bg-white rounded-full hover:bg-primary cursor-default select-none"
                                >
                                    <div className="min-w-5 max-w-5 h-5 aspect-square pointer-events-none">
                                        <Image
                                            src="https://cdn3.emoji.gg/emojis/8227-1inch.png"
                                            width={30}
                                            height={30}
                                            alt="Safe AI"
                                        />
                                    </div>
                                    <p className="text-lg align-baseline">
                                        Swaps
                                    </p>
                                </div>
                                <div
                                    onClick={() => {
                                        setCurrentMode("safe");
                                    }}
                                    className="flex align-middle items-center gap-2 justify-around px-2 py-1 border-[1px] border-gray-400 bg-white rounded-full hover:bg-primary cursor-default select-none"
                                >
                                    <div className="min-w-5 max-w-7 h-6 aspect-square pointer-events-none">
                                        <Image
                                            src="https://app.safe.global/images/safe-logo-green.png"
                                            width={36}
                                            height={36}
                                            alt="Safe AI"
                                        />
                                    </div>
                                    <p className="text-lg align-baseline">
                                        Safe Wallet
                                    </p>
                                </div>
                            </div>
                        </header>

                        {/* Pass the ref to Chatbot */}
                        <Chatbot chatMode={currentMode} ref={chatbotRef} />
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="border-1 flex flex-col items-start gap-2 rounded border border-black bg-slate-100 p-3 vh-100">
                        <div className="sticky">
                            <h1 className="text-2xl font-bold">
                                Your Active Wallet
                            </h1>
                            <p>Current Mode: {currentMode.toUpperCase()}</p>
                            <p>
                                Connection status:
                                {isConnecting && (
                                    <span> 🟡 connecting...</span>
                                )}
                                {isConnected && <span> 🟢 connected.</span>}
                                {isDisconnected && (
                                    <span> 🔴 disconnected.</span>
                                )}
                            </p>

                            {isConnected && address && (
                                <>
                                    <p>Wallet Address: 👛</p>
                                    <div>
                                        <MonoLabel label={address} />
                                    </div>
                                    <p>Wallet Balance:</p>
                                    <div>
                                        <Balance />
                                    </div>
                                    <Button
                                        onClick_={disconnect}
                                        cta="Disconnect from Octopus AI"
                                    />

                                    {/* Render the selected Safe info */}
                                    {selectedSafe && (
                                        <div className="mt-4">
                                            {/*<h1 className="text-2xl font-bold">
                                                Your Selected Safe
                                            </h1>*/}
                                            {safeView === "ai_keys" ? (
                                                <AIKeysPanel
                                                    safeAddress={selectedSafe}
                                                />
                                            ) : safeView === "queue" ? (
                                                <QueuePanel
                                                    safeAddress={selectedSafe}
                                                    onExamineTransaction={(
                                                        tx
                                                    ) => {
                                                        // Format a message to examine/parse the transaction
                                                        const message = `Explain and analyze this transaction including function selector be aware that USDC token has 6 decimals and values are shown in wei means 1,000,000  is 1 USDC:\n\`\`\`json\n${JSON.stringify(
                                                            tx,
                                                            null,
                                                            2
                                                        )}\n\`\`\``;

                                                        if (chatbotRef.current) {
                                                            chatbotRef.current.submitCustomMessage(
                                                                message
                                                            );
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <p>
                                                    Select a view from the Safe
                                                    wallet options
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
