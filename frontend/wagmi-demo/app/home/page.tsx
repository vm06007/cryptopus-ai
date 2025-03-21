"use client";

import Button from "components/Button";
import Balance from "components/Balance";

import { useState, useEffect } from "react";
import Chatbot from "chat/components/Chatbot";

import { getSafeWallets } from "chat/api";

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
}

const HandleIntegrateAI = (safeAddress: string) => {
    console.log("Integrate Octopus AI with Safe wallet:", safeAddress);
}

const HandleShowTransactions = (safeAddress: string) => {
    console.log("Show transactions for Safe wallet:", safeAddress);
}

const SafeWalletsList = ({ address }: { address: string }) => {
    const [safeWallets, setSafeWallets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSafeWallets = async () => {
            if (!address) return;

            setLoading(true);
            try {
                const data = await getSafeWallets(address);
                setSafeWallets(data.safes || []);
                setError(null);
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
        return <div className="mt-4 p-2">No Safe wallets found for this address.</div>;
    }


    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-0">
                <h2 className="text-xl font-bold mb-1">Your Safe Wallets</h2>
                {/* Create New Safe Button */}
            </div>
            {/* If there are no safes and we're not loading, show a message */}
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
                                    {/*<div className="font-medium">Safe #{index + 1}</div>*/}
                                </div>
                                <div>
                                    <MonoLabel label={shorten(safeAddress)} />
                                </div>
                                <button
                                    title="Open wallet in new tab"
                                    className="hover:bg-gray-100 p-2 rounded-full"
                                    onClick={() => window.open(`https://app.safe.global/home?safe=${safeAddress}`, '_blank')}
                                >
                                    🔗
                                    {/*<Image src="/link-icon.svg" alt="Link icon" width={16} height={16} />*/}
                                </button>
                            </div>
                            <div className="flex gap-2 items-center">
                            </div>
                            <div className="flex gap-2 items-center inline">
                                <button
                                    title="Integrate Octopus AI"
                                    className="gap-2 flex hover:bg-gray-100 p-2 rounded-full"
                                    onClick={() => HandleIntegrateAI(safeAddress)}
                                >
                                    <span>🔑</span><span>AI Keys</span>
                                </button>
                                <button
                                    title="Show unexecuted transactions"
                                    className="gap-2 flex hover:bg-gray-100 p-2 rounded-full"
                                    onClick={() => HandleShowTransactions(safeAddress)}
                                >
                                    <span>🖊️</span><span>Queue</span>
                                </button>
                            </div>
                        </div>
                    ))}
                <Button
                    cta={`Create New Safe ${address ? shorten(address) : ''}`}
                    onClick_={HandleCreateSafe}
                />
                </div>
            )}
        </div>
    );
};

export default function Home() {
    // Privy hooks
    const { ready, user, authenticated, login, connectWallet, logout, linkWallet } = usePrivy();
    const { wallets, ready: walletsReady } = useWallets();

    // WAGMI hooks
    const { address, isConnected, isConnecting, isDisconnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { setActiveWallet } = useSetActiveWallet();

    const [currentMode, setCurrentMode] = useState('ask_ai');

    if (!ready) {
        return null;
    }

    return (
        <>
            <main className="min-h-screen p-4 text-slate-800 bg-mamo trifecta-bg">
                <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 flexer">
                    <div className="border-1 flex flex-col items-start gap-2 rounded border border-black bg-slate-100 p-3 vh-100">
                        <div className="sticky">
                            <div className="flex items-center gap-4 mb-4">
                                <Image src={logo} alt='Octopus AI' width={40} />
                                <h1 className='font-urbanist text-[1.65rem] font-semibold'>
                                    Octopus AI
                                </h1>
                            </div>
                            {ready && !authenticated && (
                                <>
                                    <div className="flex items-center gap-4 full-width">
                                        <Button onClick_={login} cta="Login with Privy" />
                                    </div>
                                    <div className="flex items-center gap-4 full-width">
                                        <Button onClick_={connectWallet} cta="Connect Wallet" />
                                    </div>
                                </>
                            )}
                            {walletsReady &&
                                wallets.map((wallet) => {
                                    return (
                                        <div
                                            key={wallet.address}
                                            className="flex min-w-full flex-row flex-wrap items-center justify-between gap-2 bg-slate-50 p-4 full-width"
                                        >
                                            <div>
                                                <MonoLabel label={shorten(wallet.address)} />
                                            </div>
                                            <Button
                                                cta="Make active"
                                                onClick_={() => {
                                                    setActiveWallet(wallet);
                                                }}
                                            />
                                        </div>
                                    );
                                })}

                            {ready && authenticated && (
                                <>
                                    <p className="mt-2">You are logged in with privy.</p>
                                    <Button onClick_={connectWallet} cta="Connect another wallet" />
                                    <Button onClick_={linkWallet} cta="Link another wallet" />
                                    <textarea
                                        value={JSON.stringify(wallets, null, 2)}
                                        className="mt-2 w-full rounded-md bg-slate-700 p-4 font-mono text-xs text-slate-50 sm:text-sm"
                                        rows={JSON.stringify(wallets, null, 2).split('\n').length}
                                        disabled
                                    />
                                    <br />
                                    <textarea
                                        value={JSON.stringify(user, null, 2)}
                                        className="mt-2 w-full rounded-md bg-slate-700 p-4 font-mono text-xs text-slate-50 sm:text-sm"
                                        rows={JSON.stringify(user, null, 2).split('\n').length}
                                        disabled
                                    />
                                    <br />
                                    <Button onClick_={logout} cta="Logout from Privy" />
                                </>
                            )}

                            {/* Display Safe wallets component */}
                            {/*address && currentMode === "safe" && <SafeWalletsList address={address} />*/}
                            {address && <SafeWalletsList address={address} />}
                        </div>
                    </div>
                    <div className='flex flex-col min-h-full w-full max-w-3xl mx-auto px-4'>
                        <header className='sticky top-0 shrink-0 z-20 super'>
                            <div className='flex flex-col h-full w-full gap-1 pt-4 pb-2 bg-mamo flexing mode-selector'>
                                <div onClick={() => {
                                        setCurrentMode('ask_ai');
                                    }}  className="flex align-middle items-center gap-2 justify-around px-2 py-1 border-[1px] border-gray-400 bg-white rounded-full hover:bg-primary cursor-default select-none">
                                    <div className="min-w-5 max-w-7 h-8 aspect-square pointer-events-none">
                                        <Image src={"https://cdn-icons-png.flaticon.com/512/8021/8021762.png"} width={40} height={40} alt='Safe AI' />
                                    </div>
                                    <p className="text-lg align-baseline">Basic</p>
                                </div>
                                <div onClick={() => {
                                        setCurrentMode('trade');
                                    }}  className="flex align-middle items-center gap-2 justify-around px-2 py-1 border-[1px] border-gray-400 bg-white rounded-full hover:bg-primary cursor-default select-none">
                                    <div className="min-w-5 max-w-5 h-5 aspect-square pointer-events-none">
                                        <Image src={"https://cdn3.emoji.gg/emojis/8227-1inch.png"} width={30} height={30} alt='Safe AI' />
                                    </div>
                                    <p className="text-lg align-baseline">Swaps</p>
                                </div>
                                <div onClick={() => {
                                        setCurrentMode('safe');
                                    }} className="flex align-middle items-center gap-2 justify-around px-2 py-1 border-[1px] border-gray-400 bg-white rounded-full hover:bg-primary cursor-default select-none">
                                    <div className="min-w-5 max-w-7 h-6 aspect-square pointer-events-none">
                                        <Image src={"https://app.safe.global/images/safe-logo-green.png"} width={36} height={36} alt='Safe AI' />
                                    </div>
                                    <p className="text-lg align-baseline">Safe Wallet</p>
                                </div>
                            </div>
                        </header>
                        <Chatbot chatMode={currentMode} />
                    </div>
                    <div className="border-1 flex flex-col items-start gap-2 rounded border border-black bg-slate-100 p-3 vh-100">
                        <div className="sticky">
                            <h1 className="text-2xl font-bold">Your Active Wallet</h1>
                            <p>
                                Current Mode: {currentMode.toUpperCase()}
                            </p>
                            <p>
                                Connection status: {isConnecting && <span>🟡 connecting...</span>}
                                {isConnected && <span>🟢 connected.</span>}
                                {isDisconnected && <span> 🔴 disconnected.</span>}
                            </p>
                            {isConnected && address && (
                                <>
                                    <p>Wallet Address: 👛</p>
                                    <div><MonoLabel label={address} /></div>
                                    <p>Wallet Balance:</p>
                                    <div><Balance /></div>
                                    {/*<Signer />
                                    <SignMessage />
                                    <SignTypedData />
                                    <PublicClient />
                                    <EnsName />
                                    <EnsAddress />
                                    <EnsAvatar />
                                    <EnsResolver />
                                    <SwitchNetwork />
                                    <BlockNumber />
                                    <ContractRead />
                                    <ContractReads />
                                    <ContractEvent />
                                    <FeeData />
                                    <Token />
                                    <WatchPendingTransactions />
                                    <WalletClient />
                                    <WaitForTransaction />*/}
                                    {/*<ContractWrite />*/}
                                    {/*<h2 className="mt-6 text-2xl">useDisconnect</h2>*/}
                                    <Button onClick_={disconnect} cta="Disconnect from Octopus AI" />
                                    <h1 className="mt-4 text-2xl font-bold">Your Active Safe</h1>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
