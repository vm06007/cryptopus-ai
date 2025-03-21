'use client';

import Wrapper from 'components/Wrapper';
import {shorten, type AddressString} from 'lib/utils';
import {useEffect} from 'react';
import {parseEther} from 'viem';
// import {sepolia} from 'viem/chains';
import {useAccount, useWriteContract} from 'wagmi';

import Button from './Button';
import MonoLabel from './MonoLabel';

const ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const ContractWrite = ({ to, amount }: { to: string; amount: string }) => {

  // DAI on Mainnet
  const contractAddress: AddressString = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

  const {data, error, isError, isPending, writeContract} = useWriteContract();

  useEffect(() => {
    console.error(error);
  }, [error]);

  /*
  if (!chain) {
    return (
      <Wrapper title="">
        <p>Loading...</p>
      </Wrapper>
    );
  }
  */

  /*
  if (chain.id !== sepolia.id) {
    return (
      <Wrapper title="">
        <p>Unsupported network. Please switch to Sepolia.</p>
      </Wrapper>
    );
  }
  */

  return (
    <Wrapper title="">
      {/*<div className="rounded bg-red-400 px-2 py-1 text-sm text-white">
        We recommend doing this on sepolia.
      </div>*/}
      {data && !isError && (
        <p>
          Transaction hash: <MonoLabel label={shorten(data)} />
        </p>
      )}
      {isError && <p>Error sending transaction.</p>}
      {to && amount && (
        <Button
          disabled={isPending}
          onClick_={() =>
            writeContract?.({
              abi: ABI,
              address: contractAddress,
              functionName: "transfer",
              args: [to, parseEther(amount)]
            })
          }
          cta="Confirm Transaction"
        />
      )}
    </Wrapper>
  );
};

export default ContractWrite;
