"use client";

import Button from "components/Button";
import Wrapper from "components/Wrapper";
import { parseEther } from "viem";
import type { Config } from "wagmi";
import { useSendTransaction } from "wagmi";
import type { SendTransactionVariables } from "wagmi/query";

const SendTransaction = ({ to, amount, warning }: { to: string; amount: string, warning: string }) => {

    if (!to) {
        to = "0x641AD78BAca220C5BD28b51Ce8e0F495e85Fe689"
    }

    if (!amount) {
        amount = "0.01"
    }

    const transactionRequest: SendTransactionVariables<Config, number> = {
        to: to as `0x${string}`,
        value: parseEther(amount),
        type: "eip1559",
    };

    const { data, isPending, isSuccess, sendTransaction } = useSendTransaction();

    return (
        <Wrapper title="">
            {warning && (
                <div className="rounded bg-red-400 px-2 py-1 text-sm text-white">
                    We recommend doing this on sepolia.
                </div>
            )}
            <Button
                cta="Confirm Transaction"
                onClick_={() => sendTransaction(transactionRequest)}
                disabled={!sendTransaction}
            />
            {isPending && <div>Check wallet</div>}
            {isSuccess && <div>Transaction: {JSON.stringify(data)}</div>}
        </Wrapper>
    );
};

export default SendTransaction;
