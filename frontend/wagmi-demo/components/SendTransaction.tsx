"use client";

import Button from "components/Button";
import Wrapper from "components/Wrapper";
import { parseEther } from "viem";
import type { Config } from "wagmi";
import { useSendTransaction, useEnsAddress } from "wagmi";
import type { SendTransactionVariables } from "wagmi/query";
import { useEffect, useState } from "react";

const SendTransaction = ({ to, amount, warning }: { to: string; amount: string, warning: string }) => {
    const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | undefined>(undefined);
    const [currentEnsName, setCurrentEnsName] = useState<string | undefined>(undefined);

    // Default values
    const defaultTo = "0x641AD78BAca220C5BD28b51Ce8e0F495e85Fe689";
    const defaultAmount = "0.01";

    // Determine ENS resolution strategy
    useEffect(() => {
        if (!to) {
            setCurrentEnsName(undefined);
            setResolvedAddress(defaultTo as `0x${string}`);
            return;
        }

        if (to.startsWith('0x')) {
            setCurrentEnsName(undefined);
            setResolvedAddress(to as `0x${string}`);
            return;
        }

        // If it already has .eth, use it directly
        if (to.includes('.eth')) {
            setCurrentEnsName(to);
            return;
        }

        // If it doesn't have .eth and doesn't look like an address, try adding .eth
        if (!to.startsWith('0x')) {
            setCurrentEnsName(`${to}.eth`);
            return;
        }
    }, [to]);

    // Always call useEnsAddress hook unconditionally
    const { data: ensAddress, isLoading: isEnsLoading, isError: isEnsError } = useEnsAddress({
        name: currentEnsName,
        query:  {
            enabled: !!currentEnsName
        }
    });

    // Update resolved address when ENS resolution completes
    useEffect(() => {
        if (ensAddress) {
            setResolvedAddress(ensAddress as any);
        } else if (isEnsError && currentEnsName && to && !to.includes('.eth')) {
            // If ENS resolution fails and we were trying to resolve a name with .eth added,
            // fall back to the default address
            setResolvedAddress(defaultTo as `0x${string}`);
        }
    }, [ensAddress, isEnsError, currentEnsName, to]);

    const finalAmount = amount || defaultAmount;

    const { data, isPending, isSuccess, sendTransaction } = useSendTransaction();

    // Prepare transaction only when we have a resolved address
    const prepareTransaction = () => {
        if (!resolvedAddress) return;

        const transactionRequest: SendTransactionVariables<Config, number> = {
            to: resolvedAddress,
            value: parseEther(finalAmount),
            type: "eip1559",
        };

        sendTransaction(transactionRequest);
    };

    // Determine what to display in the UI
    const isAttemptingEnsResolution = !!currentEnsName;
    const isExplicitEns = to && to.includes('.eth');
    const isImplicitEns = isAttemptingEnsResolution && !isExplicitEns;

    return (
        <Wrapper title="">
            {warning && (
                <div className="rounded bg-red-400 px-2 py-1 text-sm text-white">
                    We recommend doing this on sepolia.
                </div>
            )}
            {isAttemptingEnsResolution && isEnsLoading && (
                <div className="text-sm mb-2">Resolving ENS name: {currentEnsName}...</div>
            )}
            {isAttemptingEnsResolution && ensAddress && (
                <div className="text-sm mb-2">
                    Resolved {isImplicitEns ? `${to} (${currentEnsName})` : currentEnsName} to {ensAddress}
                </div>
            )}
            {isAttemptingEnsResolution && !isEnsLoading && !ensAddress && (
                <div className="text-sm text-red-500 mb-2">Could not resolve ENS name: {currentEnsName}</div>
            )}
            {to && to.startsWith('0x') && (
                <div className="text-sm mb-2">Using address: {to}</div>
            )}
            <Button
                cta="Confirm Transaction"
                onClick_={() => prepareTransaction()}
                disabled={isPending || (isAttemptingEnsResolution && isEnsLoading)}
            />
            {isPending && <div>Check wallet</div>}
            {isSuccess && <div>Transaction: {JSON.stringify(data)}</div>}
        </Wrapper>
    );
};

export default SendTransaction;