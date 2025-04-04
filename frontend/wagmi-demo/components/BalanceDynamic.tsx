"use client";

import { useBalance } from "wagmi";

const Balance = ({ address }: { address: string }) => {

    const { data, isError, isLoading } = useBalance({ address });

    if (isLoading) return <div>Fetching balance…</div>;
    if (isError) return <div>Error fetching balance</div>;
    return (
        <>
            {/*<h2 className="mt-6 text-2xl">useBalance</h2>*/}
            {isLoading && <p>fetching balance...</p>}
            {isError && <p>Error fetching balance.</p>}
            {data && (
                <p>{data?.formatted} {data?.symbol}</p>
            )}
        </>
    );
};

export default Balance;
