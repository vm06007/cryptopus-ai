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

    // Default values
    const defaultTo = "0x641AD78BAca220C5BD28b51Ce8e0F495e85Fe689";
    const defaultAmount = "0.01";

    // Determine if the 'to' value might be an ENS name
    const isEns = to && to.includes('.eth');

    // Use the ENS resolution hook if it looks like an ENS name
    const { data: ensAddress, isLoading: isEnsLoading } = isEns
        ? useEnsAddress({ name: to })
        : { data: undefined, isLoading: false };

    // Update resolved address when ENS resolution completes
    useEffect(() => {
        if (ensAddress) {
            setResolvedAddress(ensAddress);
        } else if (to && to.startsWith('0x')) {
            setResolvedAddress(to as `0x${string}`);
        } else if (!to) {
            setResolvedAddress(defaultTo as `0x${string}`);
        }
    }, [to, ensAddress]);

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

    return (
        <Wrapper title="">
            {warning && (
                <div className="rounded bg-red-400 px-2 py-1 text-sm text-white">
                    We recommend doing this on sepolia.
                </div>
            )}
            {isEns && isEnsLoading && (
                <div className="text-sm mb-2">Resolving ENS name: {to}...</div>
            )}
            {isEns && ensAddress && (
                <div className="text-sm mb-2">Resolved {to} to {ensAddress}</div>
            )}
            {isEns && !isEnsLoading && !ensAddress && (
                <div className="text-sm text-red-500 mb-2">Could not resolve ENS name: {to}</div>
            )}
            <Button
                cta="Confirm Transaction"
                onClick_={() => prepareTransaction()}
            />
            {isPending && <div>Check wallet</div>}
            {isSuccess && <div>Transaction: {JSON.stringify(data)}</div>}
        </Wrapper>
    );
};

export default SendTransaction;