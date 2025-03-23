const BASE_URL = "http://localhost:5000";
const VERSION = "v1";

export async function createChat() {
    const resReal = await fetch(`${BASE_URL}/api/${VERSION}/about`, {
    // const resReal = await fetch(`${BASE_URL}/api/${VERSION}/create`, {
    // when SSL issue resolved call NILLION
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });

    const dataReal = await resReal.json();

    const data = {
        id: dataReal.chatId
    }
    const res = {
        ok: true,
        status: 200
    }
    if (!res.ok) {
        return Promise.reject({ status: res.status, data });
    }
    console.log(data);
    return data;
}

// Function to extract SEND_INFO from text and detect <EXECUTE_PENDING> flag
function extractSendInfo(text: string) {
    const sendInfoRegex = /SEND_INFO:\s*(\{[\s\S]*?\})/;
    const executePendingRegex = /<EXECUTE_PENDING>/;

    let sendInfo = null;
    let modifiedText = text;
    // Extract SEND_INFO JSON and remove it from the text
    const sendInfoMatch = modifiedText.match(sendInfoRegex);
    if (sendInfoMatch && sendInfoMatch[1]) {
        try {
            sendInfo = JSON.parse(sendInfoMatch[1]);
            modifiedText = modifiedText.replace(sendInfoRegex, "").trim();
        } catch (error) {
            console.error("Error parsing JSON:", error);
        }
    }

    // Check for <EXECUTE_PENDING> flag, remove it, and raise a flag if detected
    let executePending = false;
    if (executePendingRegex.test(modifiedText)) {
        executePending = true;
        console.log("Detected <EXECUTE_PENDING> flag");
        modifiedText = modifiedText.replace(executePendingRegex, "").trim();
    }

    return {
        sendInfo,
        executePending,
        modifiedText
    };
}

export async function sendChatMessage(chatId: number, message: string, mode: string) {
    console.log("chatId:", chatId);
    console.log("Sending message:", message);

    if (!mode) {
        mode = "ask_ai";
    }
    const resReal = await fetch(`http://localhost:5000/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            question: message,
            model: "anthropic/claude-3-haiku:beta"
        })
    });

    const dataReal = await resReal.json();
    const reply = dataReal.response;

    // Extract any SEND_INFO from the reply
    const { sendInfo, modifiedText, executePending } = extractSendInfo(reply);

    // Use the modified text (with SEND_INFO removed) for chunking
    const chunks = modifiedText.split('\n');
    const messages = chunks.map((line: string, i: number) => ({
        type: 'event',
        data: i < chunks.length - 1 ? line + '\n' : line
    }));

    const res = {
        ok: true,
        status: 200,
        json: async () => ({
            messages,
            sendInfo,
            executePending
        })
    };

    if (!res.ok) {
        return Promise.reject({ status: res.status, data: await res.json() });
    }

    return res.json();
}

export async function getAssistantAddress(address: string) {
    try {
        const response = await fetch(`${BASE_URL}/api/${VERSION}/storePrivateKey/${address}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching safe wallets:", error);
        return Promise.reject(error);
    }
}

export async function getSafeWallets(address: string) {
    try {
        const response = await fetch(`${BASE_URL}/api/${VERSION}/owners/${address}/safes`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching safe wallets:", error);
        return Promise.reject(error);
    }
}

export async function getPendingTransactions(address: string) {
    try {
        const response = await fetch(`${BASE_URL}/api/${VERSION}/tx/${address}/pending`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching pending transactions:", error);
        return Promise.reject(error);
    }
}

export async function sendPendingTransactionsToOctopusAI(
    userAddress: string,
    safeAddress: string,
    chainId: number
) {
    console.log("Sending pending transactions to Octopus AI for analysis and signing");
    // put artificial timeout for testing
    await new Promise(resolve => setTimeout(resolve, 2000));

    return { status: 200, data: { message: "Success" } };
    try {
        const f = "clearQueueWithAnalyzeAndSignAndExecute";
        const response = await fetch(`${BASE_URL}/api/${VERSION}/${f}/${safeAddress}/${userAddress}/${chainId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching pending transactions:", error);
        return Promise.reject(error);
    }
}
