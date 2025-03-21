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

    console.log(dataReal);

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

// Function to extract SEND_INFO from text
function extractSendInfo(text: string) {
    const regex = /SEND_INFO:\s*(\{[\s\S]*?\})/;
    const match = text.match(regex);

    if (match && match[1]) {
        try {
            // Parse the JSON string to an object
            const jsonObj = JSON.parse(match[1]);

            // Create a modified version of the text without the JSON part
            const modifiedText = text.replace(regex, '');

            return {
                sendInfo: jsonObj,
                modifiedText: modifiedText.trim()
            };
        } catch (error) {
            console.error("Error parsing JSON:", error);
            return {
                sendInfo: null,
                modifiedText: text
            };
        }
    }

    return {
        sendInfo: null,
        modifiedText: text
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
    const { sendInfo, modifiedText } = extractSendInfo(reply);

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
            sendInfo // Include the extracted sendInfo in the response
        })
    };

    if (!res.ok) {
        return Promise.reject({ status: res.status, data: await res.json() });
    }

    return res.json();
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