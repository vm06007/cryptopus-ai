import os
import certifi
import requests

os.environ["SSL_CERT_FILE"] = certifi.where()
import os
from dotenv import load_dotenv
from datetime import datetime
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask import request
import asyncio
import aiohttp

from web3 import Web3

load_dotenv()

app = Flask(__name__)

CORS(app, resources={r"/*/*": {
    "origins": [
        "http://localhost:3000",
        "http://localhost:4000",
        "http://localhost:5000",
    ]}
})

default_nil_ai_model = "meta-llama/Llama-3.1-8B-Instruct"
default_openrouter_ai_model = "anthropic/claude-3-haiku:beta"
safe_api_url_v1 = "https://safe-transaction-mainnet.safe.global/api/v1"
safe_api_url_v2 = "https://safe-transaction-mainnet.safe.global/api/v2/safes"


class CryptoTradingAssistant:
    def __init__(self):
        self.NILAI_API_KEY = os.getenv("NILAI_API_KEY")
        self.NILAI_API_URL = os.getenv("NILAI_API_URL")
        self.OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
        self.OPENROUTER_API_URL = os.getenv("OPENROUTER_API_URL")

    async def process_question(self, question, session_id, model):
        history = ""
        context = ""
        send_into = await self.recognize_send_request_with_ai(question, model)
        prompt = (
            f"History: {history}\n\n"
            f"Context: {context}\n\n"
            f"SEND_INFO: {send_into}\n\n"
            f"Question: {question}\n\n"
            "Instructions: Answer the question with the following format:\n"
            "- Use bullet points (or emojis as bullet point) to list key features or details.\n"
            "- Separate ideas into paragraphs for better readability!\n"
            "- Often include emojis to make the text more engaging.\n"
            "- If user asked to send funds include SEND_INFO at the end and ensure user you can invoke execution (MUST HAVE AMOUNT TO SEND) \n"
            "- SEND_INFO: must have all 3 parameters, otherwise remove SEND_INFO from response completely!\n"
        )

        # response = await self.ask_nilai(prompt, model)
        response = await self.ask_openrouter(prompt, model)
        # interaction = {"user": question, "assistant": response}
        # @TODO: Consider to save interaction to reuse later

        return response

    async def recognize_send_request_with_ai(self, request, model):
        """Use AI to extract destination from the user's request."""
        prompt = (
            "You are a crypto sending assistant. Your task is to extract the following information from the user's request:\n"
            "1. Token: The token symbol the user wants to send (e.g., WISE, ETH, BTC).\n"
            "2. Amount: The token amount the user wants to send.\n"
            "3. Destination: Address or ENS name where user wants to send funds.\n"
            "IMPORTANT:\n"
            "- Return the extracted values in this exact format: Token: <Token>, To: <Destination>, Amount: <Amount>\n"
            "- If any value is missing or not provided by the user, return empty result (do not prefil).\n\n"
            "Examples:\n"
            "- 'Send 100 ETH to vitalik.eth: ''\n"
            "- 'Send 1000 USDC to some-name.eth\n"
            "- 'I want to send 1,000 USDT to 0x22079A848266A7D2E40CF0fF71a6573D78adcF37\n\n"
            f"User's request: {request}\n\n"
            "Return ONLY the extracted values as bullet-points without any extra text, mark it as JSON OBJECT"
        )
        response = await self.ask_openrouter(prompt, model)
        return response;

    async def ask_nilai(self, prompt, model):
        headers = {"Authorization": f"Bearer {self.NILAI_API_KEY}"}
        print(f"Prompt calling nilai: {prompt}")
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a crypto trading assistant. Use the provided history to maintain conversation context."},
                {"role": "user", "content": prompt}
            ]
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(self.NILAI_API_URL, json=data, headers=headers) as response:
                if response.status == 200:
                    reply = (await response.json()).get("choices", [{}])[0].get("message", {}).get("content", "No response received.")
                    logging.info(f"Received response: {reply}")
                    return reply
                else:
                    error_message = f"NILAI API error {response.status}: {await response.text()}"
                    logging.error(error_message)
                    return error_message

    async def ask_openrouter(self, prompt, model):
        headers = {"Authorization": f"Bearer {self.OPENROUTER_API_KEY}"}
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a crypto trading assistant. Use the provided history to maintain conversation context."},
                {"role": "user", "content": prompt}
            ]
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(self.OPENROUTER_API_URL, json=data, headers=headers) as response:
                if response.status == 200:
                    reply = (await response.json()).get("choices", [{}])[0].get("message", {}).get("content", "No response received.")
                    logging.info(f"Received response: {reply}")
                    return reply
                else:
                    error_message = f"OpenRouter API error {response.status}: {await response.text()}"
                    logging.error(error_message)
                    return error_message

    async def ask_ai(self, question: str, input_model: str = ""):
        try:
            user_id = "endpoint: "+ str(datetime.now())
            session_id = f"{user_id}"
            response = ""
            if input_model == "ask_nilai":
                response = await self.process_question(question, session_id, default_nil_ai_model)
            else:
                response = await self.process_question(question, session_id, default_openrouter_ai_model)

            return response
        except Exception as e:
            logging.error(f"Error in ask_ai: {e}")
            return "An error occurred while processing your question."

crypto_assistant = CryptoTradingAssistant()

@app.route("/")
def home():
    return "Hello, World!"

@app.route("/api/v1/about", methods=["GET", "POST"])
def about():
    if request.method == "POST":
        return jsonify({"message": "hello"})
    else:
        # handle GET
        return "About"

@app.route('/ask_ai/<path:question>', methods=['GET'])
def ask_ai_get(question):
    model = request.args.get('model', default_nil_ai_model)
    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.ask_ai(question, model))
    return jsonify({"response": response})

@app.route('/ask_ai', methods=['POST', 'OPTIONS'])
def ask_ai_post():
    # can handle OPTIONS manually:
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json() or {}
    question = data.get('question', '')
    model = data.get('model', 'ask_openrouter')

    if not question:
        return jsonify({"error": "Question is empty"}), 400

    # Call your async method:
    response = asyncio.run(crypto_assistant.ask_ai(question, model))

    return jsonify({"response": response})

@app.route("/ask_nilai/<path:question>", methods=["GET"])
def ask_nilai_get(question):
    model = request.args.get("model", default_nil_ai_model)
    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.ask_nilai(question, model))
    return jsonify({"response": response})

@app.route("/ask_nilai", methods=["POST", "OPTIONS"])
def ask_nilai_post():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    question = data.get("question", default_nil_ai_model)
    model = data.get("model", "")

    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.process_question(question, model))
    return jsonify({"response": response})

@app.route("/ask_openrouter/<path:question>", methods=["GET"])
def ask_open_router_get(question):
    model = request.args.get("model", default_openrouter_ai_model)
    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.ask_openrouter(question, model))
    return jsonify({"response": response})

@app.route("/ask_openrouter", methods=["POST", "OPTIONS"])
def ask_open_router_post():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    question = data.get("question", default_openrouter_ai_model)
    model = data.get("model", "")

    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.ask_openrouter(question, model))
    return jsonify({"response": response})

@app.route("/api/v1/owners/<address>/safes", methods=["GET"])
def get_safe_wallets(address):
    try:
        # Validate the Ethereum address format
        if not Web3.is_address(address):
            return jsonify({"error": "Invalid Ethereum address format"}), 400

        # Make request to Safe API to get safes for this owner
        response = requests.get(f"{safe_api_url_v1}/owners/{address}/safes/")

        if response.status_code != 200:
            return jsonify({"error": f"Safe API error: {response.status_code}"}), response.status_code

        # Return the safe wallets data
        return jsonify(response.json())

    # Error handling
    except Exception as e:
        logging.error(f"Error getting Safe wallets for {address}: {str(e)}")
        return jsonify({"error": "Failed to retrieve Safe wallets"}), 500

@app.route("/api/v1/tx/<address>/pending", methods=["GET"])
def get_pending_txs(address):
    try:
        # Validate the Ethereum address format
        if not Web3.is_address(address):
            return jsonify({"error": "Invalid Ethereum address format"}), 400

        # Basic Safe API request to get pending transactions
        response = requests.get(f"{safe_api_url_v2}/{address}/multisig-transactions/?executed=false")

        if response.status_code != 200:
            return jsonify({"error": f"Safe API error: {response.status_code}"}), response.status_code

        # Return the transaction wallets data
        return jsonify(response.json())

    # Error handling
    except Exception as e:
        logging.error(f"Error getting transactions for {address}: {str(e)}")
        return jsonify({"error": "Failed to retrieve transactions"}), 500

if __name__ == "__main__":
    app.run()


