import os
import certifi
os.environ['SSL_CERT_FILE'] = certifi.where()
import os
from dotenv import load_dotenv
import logging
from flask import Flask, jsonify, make_response
from flask_cors import CORS
from flask import request
import asyncio
import aiohttp

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

class CryptoTradingAssistant:
    def __init__(self):
        self.NILAI_API_KEY = os.getenv("NILAI_API_KEY")
        self.NILAI_API_URL = os.getenv("NILAI_API_URL")

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

crypto_assistant = CryptoTradingAssistant()

@app.route("/")
def home():
    return 'Hello, World!'

@app.route('/about', methods=['GET', 'POST'])
def about():
    if request.method == 'POST':
        return jsonify({"message": "hello"})
    else:
        # handle GET
        return 'About'

@app.route('/ask_nilai/<path:question>', methods=['GET'])
def ask_ai_get(question):
    model = request.args.get('model', default_nil_ai_model)
    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.ask_nilai(question, model))
    return jsonify({"response": response})

@app.route('/ask_nilai', methods=['POST', 'OPTIONS'])
def ask_ai_post():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json() or {}
    question = data.get('question', default_nil_ai_model)
    model = data.get('model', '')

    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.ask_nilai(question, model))
    return jsonify({"response": response})

if __name__ == "__main__":
    app.run()


