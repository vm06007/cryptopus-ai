"use client";

import Wrapper from "components/Wrapper";
import { shorten, type AddressString } from "lib/utils";
import { useEffect } from "react";
import { parseUnits } from "viem";
import { useWriteContract, useAccount } from "wagmi";

import Button from "./Button";
import MonoLabel from "./MonoLabel";

// UniswapV2 Router ABI for swapExactTokensForTokens
const swapABI = [
    {
        inputs: [
            { internalType: "uint256", name: "amountIn", type: "uint256" },
            { internalType: "uint256", name: "amountOutMin", type: "uint256" },
            { internalType: "address[]", name: "path", type: "address[]" },
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "deadline", type: "uint256" },
        ],
        name: "swapExactTokensForTokens",
        outputs: [
            { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

// UniswapV2 Router Address (Mainnet)
const routerAddress: AddressString =
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

// Known token addresses (update WISE with your real address)
const knownTokens: Record<string, AddressString> = {
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    WISE: "0xYourWISEAddressHere", // Replace with the actual WISE token address
};

// Token decimals for conversion
const tokenDecimals: Record<string, number> = {
    [knownTokens.DAI.toLowerCase()]: 18,
    [knownTokens.USDC.toLowerCase()]: 6,
    [knownTokens.USDT.toLowerCase()]: 6,
    [knownTokens.WISE.toLowerCase()]: 18,
};

const ContractWriteSwap = ({
    swapAmount,  // Amount of the input token to swap (as a string)
    fromToken,   // Input token symbol or address
    toToken,     // Output token symbol or address
}: {
    swapAmount: string;
    fromToken: string;
    toToken: string;
}) => {
    // Use connected wallet as the recipient address
    const { address, isConnected } = useAccount();
    const resolvedTo: AddressString | undefined = address?.startsWith("0x") ? (address as AddressString) : undefined;

    // Determine final token addresses for fromToken and toToken
    let finalFrom: AddressString | undefined;
    if (fromToken.startsWith("0x") && fromToken.length === 42) {
        finalFrom = fromToken as AddressString;
    } else {
        finalFrom = knownTokens[fromToken.toUpperCase()];
    }

    let finalTo: AddressString | undefined;
    if (toToken.startsWith("0x") && toToken.length === 42) {
        finalTo = toToken as AddressString;
    } else {
        finalTo = knownTokens[toToken.toUpperCase()];
    }

    const { data, error, isError, isPending, writeContract } = useWriteContract();

    // Handle swap transaction submission
    const handleSwap = () => {
        console.log(swapAmount, 'swapAmount')
        console.log(finalFrom, 'finalFrom')
        console.log(finalTo, 'finalTo')
        // if (!resolvedTo || !swapAmount || !finalFrom || !finalTo) return;
        const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes from now
        const amountIn = parseUnits(
            swapAmount,
            18
        );
        const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const args = {
            abi: swapABI,
            address: routerAddress,
            functionName: "swapExactTokensForTokens",
            args: [
                amountIn,
                1E6, // amountOutMin (set to 0 for now; adjust as needed)
                [
                    finalFrom,
                    WETH,
                    finalTo
                ],
                resolvedTo as any,
                deadline,
            ],
        };

        console.log(args, 'args');
        writeContract?.(args as any);
    };

    useEffect(() => {
        if (error) {
            console.error(error);
        }
    }, [error]);

    return (
        <Wrapper title="">
            {data && !isError && (
                <p>
                    Transaction hash: <MonoLabel label={shorten(data)} />
                </p>
            )}
            {isError && <p>Error sending swap transaction.</p>}
            <Button
                disabled={
                    isPending
                }
                onClick_={handleSwap}
                cta="Execute Swap"
            />
        </Wrapper>
    );
};

export default ContractWriteSwap;
