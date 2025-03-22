import { useState } from "react";
import { useAccount } from "wagmi";
import Button from "components/Button";
import { shorten } from "lib/utils";
import MonoLabel from "components/MonoLabel";
// Updated imports with explicit versions that work with the first example
import SafeApiKit from "@safe-global/api-kit";
import { ethers } from "ethers";
// import EthersAdapter from "@safe-global/protocol-kit";
import Safe from "@safe-global/protocol-kit";
// import { OperationType } from "@safe-global/safe-core-sdk-types";

// AI Assistant address (same as used in your CreateSafeWallet component)
const AI_ASSISTANT_ADDRESS = "0xaAE0dB14a36784682668241b6bF9C0B3b795EA97";

const AIKeysPanel = ({ safeAddress }: { safeAddress: string }) => {
    const { address } = useAccount();
    // const { data: walletClient } = useWalletClient();
    const [canExecute, setCanExecute] = useState(false);
    const [autoReject, setAutoReject] = useState(false);
    const [autoExecute, setAutoExecute] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExecuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setCanExecute(isChecked);
        if (!isChecked) {
            setAutoReject(false);
            setAutoExecute(false);
        }
    };

    const handleAutoRejectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAutoReject(e.target.checked);
    };

    const handleAutoExecuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAutoExecute(e.target.checked);
    };

    // This function triggers the transaction to add the AI Assistant as a new owner using Safe SDK
    const handleAddAIAssistant = async () => {
        if (!address) {
            setError("Wallet not connected");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Create ethers provider and signer
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            // Initialize the Safe API Kit for transaction service

            const apiKit = new SafeApiKit({
                chainId: 1n
            })

            const safeSdk = await Safe.init({
                provider: "",
                signer: "",
                safeAddress: safeAddress
            })

            // Fetch current Safe info - owners and threshold
            const safeInfo = await apiKit.getSafeInfo(safeAddress);
            const currentOwners = safeInfo.owners;
            const currentThreshold = safeInfo.threshold;

            // Check if AI Assistant is already an owner
            if (currentOwners.includes(AI_ASSISTANT_ADDRESS)) {
                throw new Error("AI Assistant is already an owner of this Safe");
            }

            // Set the new threshold (increment by 1 as in first example)
            const newThreshold = currentThreshold + 1;

            const safeInterface = new ethers.utils.Interface([
                "function addOwnerWithThreshold(address owner, uint256 _threshold)"
            ])

            const data = safeInterface.encodeFunctionData('addOwnerWithThreshold', [
                AI_ASSISTANT_ADDRESS,
                newThreshold
            ])

            // Create a transaction to add owner with threshold
            // Using the native Safe SDK method
            const safeTransactionData = {
                to: safeAddress,
                value: "0",
                data: data
            };

            // Create a Safe transaction
            const safeTransaction = await safeSdk.createTransaction({
                transactions: [safeTransactionData]
            });

            // Sign the transaction
            const signedSafeTx = await safeSdk.signTransaction(safeTransaction);

            // Get the hash
            const safeTxHash = await safeSdk.getTransactionHash(safeTransaction);

            // Propose the transaction to the Safe service
            await apiKit.proposeTransaction({
                safeAddress,
                safeTransactionData: safeTransaction.data,
                safeTxHash,
                senderAddress: address,
                senderSignature: signedSafeTx.signatures.get(address.toLowerCase())?.data || ""
            });

            console.log("Successfully proposed transaction to add AI Assistant to safe:", safeAddress);
            setTxHash(safeTxHash);

        } catch (err) {
            console.error("Error adding AI Assistant:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h2 className="text-xl font-bold mb-3">
                AI Keys Permission for Safe Wallet
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
                    cta="Update Permissions"
                    onClick_={() =>
                        console.log("Saving AI permissions for", safeAddress)
                    }
                />
                <Button
                    disabled
                    cta={isLoading ? "Adding AI Assistant..." : "Add AI"}
                    onClick_={handleAddAIAssistant}
                />
            </div>
            {error && (
                <div className="mt-2 text-red-500">
                    Error: {error}
                </div>
            )}
            {txHash && (
                <div className="mt-2 text-green-500">
                    Transaction submitted successfully. Hash: {shorten(txHash)}
                </div>
            )}
        </div>
    );
};

export default AIKeysPanel;