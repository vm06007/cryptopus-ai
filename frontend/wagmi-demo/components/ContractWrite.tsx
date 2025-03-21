"use client";

import Wrapper from "components/Wrapper";
import { shorten, type AddressString } from "lib/utils";
import { useEffect, useState } from "react";
import { parseUnits } from "viem";
// import { sepolia } from "viem/chains";
import { useAccount, useWriteContract, useEnsAddress } from "wagmi";

import Button from "./Button";
import MonoLabel from "./MonoLabel";

const ABI = [
    {
        inputs: [
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "transfer",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

const ContractWrite = ({ to, amount, token }: { to: string; amount: string; token: string; }) => {
    // State to store the resolved address
    const [resolvedAddress, setResolvedAddress] = useState<AddressString | undefined>(undefined);
    const [ensLookupName, setEnsLookupName] = useState<string | undefined>(undefined);

    // DAI on Mainnet
    const contractAddress: AddressString = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const knownTokens: Record<string, AddressString> = {
        DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    };
    const tokenDecimals: Record<string, number> = {
        [knownTokens.DAI.toLowerCase()]: 18,
        [knownTokens.USDC.toLowerCase()]: 6,
        [knownTokens.USDT.toLowerCase()]: 6
    };
    let finalAddress: AddressString | undefined;
    if (token.startsWith("0x") && token.length === 42) {
        finalAddress = token as AddressString;
    } else {
        const upper = token.toUpperCase();
        finalAddress = knownTokens[upper];
    }

    const { data, error, isError, isPending, writeContract } = useWriteContract();

    // Determine if we need to do ENS resolution
    useEffect(() => {
        if (!to) {
            setEnsLookupName(undefined);
            setResolvedAddress(undefined);
            return;
        }
        if (to.startsWith("0x")) {
            setEnsLookupName(undefined);
            setResolvedAddress(to as AddressString);
            return;
        }
        if (to.includes(".eth")) {
            setEnsLookupName(to);
            return;
        }
        setEnsLookupName(`${to}.eth`);
    }, [to]);

    // Use ENS resolution hook
    const {
        data: ensAddress,
        isLoading: isEnsLoading,
        isError: isEnsError
    } = useEnsAddress({
        name: ensLookupName,
        query: {
            enabled: !!ensLookupName,
        }
    });

    // Update resolved address when ENS resolution completes
    useEffect(() => {
        if (ensAddress) {
            setResolvedAddress(ensAddress as AddressString);
        } else if (isEnsError && ensLookupName) {
            setResolvedAddress(undefined);
        }
    }, [ensAddress, isEnsError, ensLookupName]);

    // Log errors
    useEffect(() => {
        if (error) {
            console.error(error);
        }
    }, [error]);

    // Handle transaction submission
    const handleTransfer = () => {
        if (!resolvedAddress || !amount) return;
        writeContract?.({
            abi: ABI,
            address: finalAddress || contractAddress,
            functionName: "transfer",
            args: [resolvedAddress, parseUnits(amount, tokenDecimals[finalAddress?.toLowerCase() || ""] ?? 18)]
        });
    };

    // Display name logic for UI
    const isExplicitEns = to && to.includes(".eth");
    const isImplicitEns = ensLookupName && !isExplicitEns && to;
    const displayName = isImplicitEns ? `${to} (${ensLookupName})` : ensLookupName || to;

    return (
        <Wrapper title="">
            {ensLookupName && isEnsLoading && (
                <p className="text-sm mb-2">Resolving ENS name: {displayName}...</p>
            )}
            {ensLookupName && ensAddress && (
                <p className="text-sm mb-2">
                    Resolved {displayName} to {shorten(ensAddress)}
                </p>
            )}
            {ensLookupName && !isEnsLoading && isEnsError && (
                <p className="text-sm text-red-500 mb-2">Could not resolve ENS name: {displayName}</p>
            )}
            {data && !isError && (
                <p>
                    Transaction hash: <MonoLabel label={shorten(data)} />
                </p>
            )}
            {isError && <p>Error sending transaction.</p>}
            <Button
                disabled={isPending || isEnsLoading || !resolvedAddress || !amount}
                onClick_={handleTransfer}
                cta="Confirm Transaction"
            />
        </Wrapper>
    );
};

export default ContractWrite;
