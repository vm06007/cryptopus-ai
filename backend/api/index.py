import os
import certifi
import requests

os.environ["SSL_CERT_FILE"] = certifi.where()
import os
from dotenv import load_dotenv
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
safe_api_url = "https://safe-transaction-mainnet.safe.global/api/v2/safes/"

class CryptoTradingAssistant:
    def __init__(self):
        self.NILAI_API_KEY = os.getenv("NILAI_API_KEY")
        self.NILAI_API_URL = os.getenv("NILAI_API_URL")
        self.OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
        self.OPENROUTER_API_URL = os.getenv("OPENROUTER_API_URL")

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

    response = asyncio.run(crypto_assistant.ask_nilai(question, model))
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
        response = requests.get(f"{safe_api_url}/{address}/safes/")

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
        response = requests.get(f"{safe_api_url}/{address}/multisig-transactions/?executed=false")

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


