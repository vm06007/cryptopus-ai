"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { encodeFunctionData } from "viem";
// import { parseEther } from "viem";
import Button from "components/Button";
import MonoLabel from "components/MonoLabel";

// @TODO: load dynamically based on connected wallet
const octopPUK = "0xaAE0dB14a36784682668241b6bF9C0B3b795EA97";

const SAFE_PROXY_FACTORY_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_singleton",
                "type": "address"
            },
            {
                "internalType": "bytes",
                "name": "initializer",
                "type": "bytes"
            },
            {
                "internalType": "uint256",
                "name": "saltNonce",
                "type": "uint256"
            }
        ],
        "name": "createProxyWithNonce",
        "outputs": [
            {
                "internalType": "contract GnosisSafeProxy",
                "name": "proxy",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

const SAFE_SETUP_ABI = [
    {
        "inputs": [
            {
                "internalType": "address[]",
                "name": "_owners",
                "type": "address[]"
            },
            {
                "internalType": "uint256",
                "name": "_threshold",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            },
            {
                "internalType": "address",
                "name": "fallbackHandler",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "paymentToken",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "payment",
                "type": "uint256"
            },
            {
                "internalType": "address payable",
                "name": "paymentReceiver",
                "type": "address"
            }
        ],
        "name": "setup",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

// Current addresses for Safe contracts - Mainnet
const SAFE_ADDRESSES = {
    PROXY_FACTORY: "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2", // Safe Proxy Factory
    SINGLETON: "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552", // Safe Singleton (implementation)
    FALLBACK_HANDLER: "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4", // Default Handler
};

const CreateSafeWallet = ({wallets}: {wallets: any[]}) => {
    const { address } = useAccount();
    // loop through wallets and extract wallets.addres into array
    const extractedWallets = wallets.map(wallet => wallet.address);

    useEffect(() => {
        const extractedWallets = wallets.map(wallet => wallet.address);
        setOwners(extractedWallets);
    }, [wallets]);

    const [owners, setOwners] = useState<string[]>(extractedWallets ? [...extractedWallets] : []);
    const [newOwner, setNewOwner] = useState<string>("");
    const [threshold, setThreshold] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [salt, setSalt] = useState<string>(Math.floor(Math.random() * 1000000).toString());

    const { data: txHash, isPending, writeContract } = useWriteContract();

    const addOwner = () => {
        if (!newOwner || !newOwner.startsWith("0x") || newOwner.length !== 42) {
            setError("Please enter a valid Ethereum address");
            return;
        }
        if (owners.includes(newOwner)) {
            setError("This owner is already added");
            return;
        }

        setOwners([...owners, newOwner]);
        setNewOwner("");
        setError(null);
    };

    const removeOwner = (ownerToRemove: string) => {
        setOwners(owners.filter(owner => owner !== ownerToRemove));
        if (threshold > (owners.length + 1) - 1) {
            setThreshold((owners.length + 1) - 1 > 0 ? (owners.length + 1) - 1 : 1);
        }
    };

    const handleCreateSafe = async () => {
        if (!address) {
            setError("Please connect your wallet first");
            console.log("Please connect your wallet first");
            return;
        }

        if (threshold > owners.length + 1) {
            setError(`Threshold cannot be greater than the number of owners (${owners.length})`);
            console.log(`Threshold cannot be greater than the number of owners (${owners.length})`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('---!!---')
            // Encode the setup call
            const setupData = {
                owners: owners,
                threshold: threshold,
                to: "0x0000000000000000000000000000000000000000", // No initial transaction
                data: "0x", // No data for initial transaction
                fallbackHandler: SAFE_ADDRESSES.FALLBACK_HANDLER,
                paymentToken: "0x0000000000000000000000000000000000000000", // No payment token
                payment: 0, // No payment
                paymentReceiver: "0x0000000000000000000000000000000000000000" // No payment receiver
            };

            const initializer = encodeFunctionData({
                abi: SAFE_SETUP_ABI,
                functionName: "setup",
                args: [
                    [
                        octopPUK,
                        ...setupData.owners
                    ] as any,
                    BigInt(threshold),
                    "0x0000000000000000000000000000000000000000", // to
                    "0x", // data
                    SAFE_ADDRESSES.FALLBACK_HANDLER as any, // fallbackHandler
                    "0x0000000000000000000000000000000000000000", // paymentToken
                    BigInt(0), // payment
                    "0x0000000000000000000000000000000000000000", // paymentReceiver
                ],
            });

            const args = [
                SAFE_ADDRESSES.SINGLETON as any,
                initializer as any, // Pass the encoded data
                0
            ];
            // Call createProxyWithNonce on the factory
            const obj = {
                address: SAFE_ADDRESSES.PROXY_FACTORY as any,
                abi: SAFE_PROXY_FACTORY_ABI,
                functionName: "createProxyWithNonce",
                args: args,
                query: {
                    enabled: true
                }
            }

            writeContract(obj as any);

        } catch (err) {
            console.error("Error creating Safe wallet:", err);
            setError("Failed to create Safe wallet. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">AI Assistant</label>
                    <div className="space-y-2 t-10 mb-3">
                        <MonoLabel label={octopPUK} />
                    </div>
                <label className="block text-sm font-medium text-gray-700 mb-0">Owners</label>
                <div className="space-y-2 t-10">
                    {owners.map((owner, index) => (
                        <div key={index} className="flex items-center">
                            <MonoLabel label={owner} />
                            <button
                                onClick={() => removeOwner(owner)}
                                className="text-red-500 hover:text-red-700 ml-2"
                                title="Remove owner"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-2 flex gap-2">
                    <input
                        type="text"
                        placeholder="0x... Address"
                        value={newOwner}
                        onChange={(e) => setNewOwner(e.target.value)}
                        className="flex-1 p-2 border rounded"
                    />
                    <button
                        onClick={addOwner}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                        Add
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmation Threshold (out of {owners.length + 1})
                </label>
                <input
                    type="number"
                    min="1"
                    max={owners.length + 1}
                    value={threshold}
                    onChange={(e) => setThreshold(Math.min(parseInt(e.target.value) || 1, owners.length + 1))}
                    className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                    {threshold} out of {owners.length + 1} owner(s) will need to confirm
                </p>
            </div>

            <div className="mb-4 hidden">
                <label className="block text-sm font-medium text-gray-700 mb-1">Salt Nonce</label>
                <input
                    type="text"
                    value={salt}
                    onChange={(e) => setSalt(e.target.value)}
                    className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                    Random value used to determine the address of your new Safe wallet
                </p>
            </div>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            {txHash && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="font-medium text-green-800">Success! Transaction submitted.</p>
                    <p className="text-sm">Transaction Hash: <MonoLabel label={txHash} /></p>
                    <p className="text-sm mt-1">
                        Your Safe will be deployed once this transaction is confirmed.
                    </p>
                </div>
            )}

            <div className="full-width">
                <Button
                    cta={isPending ? "Creating Safe..." : "Create Safe AI Wallet"}
                    onClick_={handleCreateSafe}
                    disabled={loading || isPending || owners.length === 0 || threshold < 1 || threshold > owners.length + 1}
                />
            </div>
        </div>
    );
};

export default CreateSafeWallet;