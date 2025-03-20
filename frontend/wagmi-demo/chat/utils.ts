// Simulate a network delay for mocking purposes
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Interface for a Server-Sent Event message
interface SSEMessage {
    type: string;
    data: any;
}

// Interface for a JSON response from the server
interface JSONResponse {
    messages: SSEMessage[];
}

// Parse a JSON response from the server and yield each SSE message
export async function* parseSSEStream(
    jsonResponse: JSONResponse,
    fetchDelay: number = 500,
    chunkDelay: number = 100
): AsyncGenerator<any> {
    console.log("Incoming JSON Response:", jsonResponse);

    // Simulate initial network delay before processing messages
    await delay(fetchDelay);

    // Simulate streaming delay between chunks
    for (const chunk of jsonResponse.messages) {
        if (chunk.type === "event") {
            await delay(chunkDelay);
            yield chunk.data;
        }
    }
}
