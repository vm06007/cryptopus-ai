import Chatbot from "@/components/Chatbot";

function App() {
    return (
        <div className="flex flex-col min-h-full w-full max-w-3xl mx-auto px-4">
            <Chatbot chatMode={"ask_openrouter"} />
        </div>
    );
}

export default App;