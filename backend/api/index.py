import certifi
import requests
import json
import os
import time
import re
from eth_account import Account
from dotenv import load_dotenv
from datetime import datetime
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask import request
import asyncio
import aiohttp
import sqlite3
import ssl
import nest_asyncio
nest_asyncio.apply()
from automateSigningExecute import execute_pending_safe_transactions
from automateSigningExecuteSingle import execute_single_pending_safe_transaction
from massageDataPending import get_lowest_pending_tx_info
from proposeMaliciousTransaction import propose_malicious_tx

app = Flask(__name__)

from org_config import org_config
from secretvaults import SecretVaultWrapper, OperationType
os.environ["SSL_CERT_FILE"] = certifi.where()

from web3 import Web3

from schema_create import create_schema
import os

load_dotenv()

app = Flask(__name__)

botRunning = False

CORS(app, resources={r"/*/*": {
    "origins": [
        "http://localhost:3000",
        "http://localhost:4000",
        "http://localhost:5000",
    ]}
})

default_nil_ai_model = "meta-llama/Llama-3.1-8B-Instruct"
default_openrouter_ai_model = "google/gemini-2.0-flash-lite-001"
safe_api_url_v1 = "https://safe-transaction-mainnet.safe.global/api/v1"
safe_api_url_v2 = "https://safe-transaction-mainnet.safe.global/api/v2"
safe_api_url_v3 = "https://safe-transaction-arbitrum.safe.global/api/v2"
class CryptoTradingAssistant:
    def __init__(self):
        self.NILAI_API_KEY = os.getenv("NILAI_API_KEY")
        self.NILAI_API_URL = os.getenv("NILAI_API_URL")
        self.NIL_SV_SCHEMA_ID = os.getenv("NIL_SECRET_VAULT_SCHEMA_ID")
        self.OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
        self.OPENROUTER_API_URL = os.getenv("OPENROUTER_API_URL")
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        self.DB_PATH = os.path.join(self.BASE_DIR, "tokens.db")
        self.collection = SecretVaultWrapper(
            org_config["nodes"],
            org_config["org_credentials"],
            self.NIL_SV_SCHEMA_ID,
            operation=OperationType.STORE,
        )
        self.init_db()

    async def process_question_safe(self, question, user_id, model):
        await self.collection.init()
        history = await self.collection.read_from_nodes()
        # context = await self.get_pending_txs(safe_wallet)
        context = ""
        # send_into = await self.recognize_send_request_with_ai(question, model)
        prompt = (
            f"History: {history}\n\n"
            f"Context: {context}\n\n"
            #f"SEND_INFO: {send_into}\n\n"
            f"Question: {question}\n\n"
            "You are a crypto security assistant Octopus AI. Your task is to analyze SAFE wallet (multisig wallet) pending transactions and determine if its safe to execute them:\n"
            "Instructions: Answer the question with the following format:\n"
            "Check if there are transaction user is curious about:\n"
            "Analyze byte-data of the transaction and function selectors:\n"
            "Determine if it is safe to execute these transactions check with user about destinatino address:\n"
            "Make sure to be aware of units usually all values with 18 decimal precision when analyzing transaction:\n"
            "- Use bullet points (or emojis as bullet point) to list key features or details.\n"
            "- Separate ideas into paragraphs for better readability!\n"
            "- Often include emojis to make the text more engaging.\n"
            "If users prompt includes words execute,pending,transaction and he asks to proceed then ignore analysis and output <EXECUTE_PENDING> at the end ONLY if user asks to execute pending transactions, otherwise remove it completely!\n"
        )

        response = ""
        if (model == default_nil_ai_model):
            response = await self.ask_nilai(prompt, model)
        else:
            response = await self.ask_openrouter(prompt, model)

        data = []
        interaction = {
            "user": user_id,
            "interactions": [
                {
                    "question": question,
                    "response": response,
                }
            ],
        }
        data.append(interaction)
        await self.collection.write_to_nodes(data)
        return response

    async def process_question(self, question, user_id, model):
        await self.collection.init()
        # @TODO: pass session_id or user_address to get history based on user
        history = await self.collection.read_from_nodes()
        context = ""
        send_into = await self.recognize_send_request_with_ai(question, model)
        prompt = (
            f"History: {history}\n\n"
            f"Context: {context}\n\n"
            f"SEND_INFO: {send_into}\n\n"
            f"Question: {question}\n\n"
            "You are a crypto sending assistant Octopus AI. Your task is to extract the following information from the user's request:\n"
            "Instructions: Answer the question with the following format:\n"
            "- Use bullet points (or emojis as bullet point) to list key features or details.\n"
            "- Separate ideas into paragraphs for better readability!\n"
            "- Often include emojis to make the text more engaging.\n"
            "- If user asked to send funds include SEND_INFO at the end and ensure user you can invoke execution (MUST HAVE AMOUNT TO SEND) \n"
            "- SEND_INFO: must have all 3 parameters, otherwise remove SEND_INFO from response completely!\n"
        )

        response = ""
        if (model == default_nil_ai_model):
            response = await self.ask_nilai(prompt, model)
        else:
            response = await self.ask_openrouter(prompt, model)

        data = []
        interaction = {
            "user": user_id,
            "interactions": [
                {
                    "question": question,
                    "response": response,
                }
            ],
        }
        data.append(interaction)
        await self.collection.write_to_nodes(data)
        return response

    async def recognize_send_request_with_ai(self, request, model):
        """Use AI to extract destination from the user's request."""
        prompt = (
            "You are a crypto sending assistant Octopus AI. Your task is to extract the following information from the user's request:\n"
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
        ssl_context = ssl.create_default_context(cafile=certifi.where())
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
            async with session.post(self.NILAI_API_URL, json=data, headers=headers, ssl=ssl_context) as response:
                if response.status == 200:
                    reply = (await response.json()).get("choices", [{}])[0].get("message", {}).get("content", "No response received.")
                    logging.info(f"Received response: {reply}")
                    return reply
                else:
                    error_message = f"NILAI API error {response.status}: {await response.text()}"
                    logging.error(error_message)
                    return error_message

    async def ask_openrouter(self, prompt, model):
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        headers = {"Authorization": f"Bearer {self.OPENROUTER_API_KEY}"}
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a crypto trading assistant Octopus AI. Use the provided history to maintain conversation context."},
                {"role": "user", "content": prompt}
            ]
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(self.OPENROUTER_API_URL, json=data, headers=headers, ssl=ssl_context) as response:
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
            #@TODO: use wallet address to identify user (pass to function)
            user_id = "endpoint: "+ str(datetime.now())
            # session_id = f"{user_id}"
            response = ""
            if input_model == "ask_nilai":
                response = await self.process_question(question, user_id, default_nil_ai_model)
            else:
                response = await self.process_question(question, user_id, default_openrouter_ai_model)

            return response
        except Exception as e:
            logging.error(f"Error in ask_ai: {e}")
            return "An error occurred while processing your question."

    async def ask_ai_safe(self, question: str, input_model: str = ""):
        try:
            # @TODO: use wallet address to identify user (pass to function)
            user_id = "endpoint: "+ str(datetime.now())
            response = ""
            if input_model == "ask_nilai":
                response = await self.process_question_safe(question, user_id, default_openrouter_ai_model)
            else:
                response = await self.process_question_safe(question, user_id, default_openrouter_ai_model)

            return response
        except Exception as e:
            logging.error(f"Error in ask_ai: {e}")
            return "An error occurred while processing your question."

    async def trade(self, request: str):

        # @TODO: use wallet address to identify user (pass to function)
        user_id = 'endpoint: '+ str(datetime.now())
        await self.collection.init()
        # @TODO: pass session_id or user_address to get history based on user
        history = await self.collection.read_from_nodes()

        swap_info = await self.recognize_swap_request_with_ai(request, default_openrouter_ai_model)
        logging.info(f"Swap request: {swap_info}")
        prompt = (
            f"History: {history}\n\n"
            "Instructions: Answer the question with the following format:\n"
            "- Use bullet points to list key features or details.\n"
            "- Separate ideas into paragraphs for better readability.\n"
            "- Always include emojis to make the text more engaging.\n"
        )

        response = await self.ask_openrouter(prompt, default_openrouter_ai_model)

        if not swap_info:
            return response

        tokenA, tokenB, AmountA, AmountB = swap_info

        chain = "🦄 Uniswap"

        # Check for tokens in DB
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()
        c.execute("SELECT name, address FROM tokens_list")
        tokens = c.fetchall()
        conn.close()

        # Construct dictionary for tokens
        token_dict = {name: address for name, address in tokens}
        supported_tokens = set(token_dict.keys())

        # Verify tokens
        if not tokenA:
            message = (
                f"⚠️ TokenA is missing. Both TokenA and TokenB must be specified and supported. Please check your input.\n"
                f"Supported tokens: {', '.join(supported_tokens)}"
            )

        else:
            unsupported_tokens = [t for t in (tokenA, tokenB) if t not in supported_tokens]
            if unsupported_tokens:
                message = (
                    f"⚠️ The following tokens are not supported: {', '.join(unsupported_tokens)}.\n"
                    f"Supported tokens: {', '.join(supported_tokens)}"
                )
                return message

            else:
                tokenA_address = token_dict[tokenA]
                tokenB_address = token_dict[tokenB]

                swap_info_object = {
                    "from_token": tokenA_address,
                    "to_token": tokenB_address,
                    "from_amount": AmountA,
                    "to_amount": AmountB,
                    "chain": chain
                }

                message = f"🔄 **Swap Request** 🔄\n\n"
                message += f"SWAP_INFO: {swap_info_object} \n"
                if AmountA and AmountB:
                    message += f"You've requested to swap: {AmountA} {tokenA} ({tokenA_address}) to {AmountB} {tokenB} ({tokenB_address}) on {chain}"
                elif AmountA:
                    message += f"You've requested to swap: {AmountA} {tokenA} ({tokenA_address}) to {tokenB} ({tokenB_address}) on {chain}"
                elif AmountB:
                    message += f"You've requested to swap: {tokenA} ({tokenA_address}) to {AmountB} {tokenB} ({tokenB_address}) on {chain}"
                else:
                    message += f"You've requested to swap: {tokenA} ({tokenA_address}) to {tokenB} ({tokenB_address}) on {chain}"

                message += (
                    "\n**⚠️ Please double-check details.**"
                )

        # interaction_data = {"user": request, "assistant": message}
        # @TODO: Save interaction_data for AI training
        return message

    async def recognize_swap_request_with_ai(self, request, model):
        """Use AI to extract tokens from the user's request."""
        prompt = (
            "You are a crypto trading assistant. Your task is to extract the following information from the user's request:\n"
            "1. TokenA: The token symbol the user wants to swap FROM (e.g., WISE, ETH, BTC).\n"
            "2. TokenB: The token symbol the user wants to swap TO (e.g., USDT, ETH, DAI).\n"
            "3. AmountA: The amount of TokenA the user wants to swap. If unspecified, return an empty string ''.\n"
            "4. AmountB: The amount of TokenB the user wants to receive. If unspecified, return an empty string ''.\n\n"
            "IMPORTANT:\n"
            "- If the user wants to 'sell' or 'swap' a token, TokenA is the token being sold/swapped, and AmountA is the amount.\n"
            "- If the user wants to 'buy' a token, TokenB is the token being bought, and AmountB is the amount.\n"
            "- Return the extracted values in this exact format: TokenA: <TokenA>, TokenB: <TokenB>, AmountA: <AmountA>, AmountB: <AmountB>\n"
            "- If any value is missing or not provided by the user, replace it with an empty string ''.\n\n"
            f"User's request: {request}\n\n"
            "Return only the extracted values without any extra text."
        )

        response = await self.ask_openrouter(prompt, model)

        # Try to parse the response with labels
        pattern = re.compile(
            r"TokenA:\s*(?:\"([^\"]*)\"|'([^']*)'|([\w-]*)|())\s*,\s*"
            r"TokenB:\s*(?:\"([^\"]*)\"|'([^']*)'|([\w-]*)|())\s*,\s*"
            r"(?:AmountA:\s*(?:\"?([0-9.,]*)\"?)\s*,?\s*)?"
            r"(?:AmountB:\s*(?:\"?([0-9.,]*)\"?)\s*,?\s*)?"
            r"|(?:AmountB:\s*(?:\"?([0-9.,]*)\"?)\s*,?\s*)?"
            r"(?:AmountA:\s*(?:\"?([0-9.,]*)\"?)\s*,?\s*)?"
        )
        match = pattern.search(response)

        if match:
            tokenA = (match.group(1) or match.group(2) or match.group(3) or '').upper()
            tokenB = (match.group(5) or match.group(6) or match.group(7) or '').upper()
            amountA = (match.group(9) or match.group(12) or '').rstrip(',')
            amountB = (match.group(10) or match.group(11) or '').rstrip(',')

            return tokenA, tokenB, amountA, amountB

        return '', '', '', ''

    def init_db(self):
        conn = sqlite3.connect(self.DB_PATH)
        c = conn.cursor()

        c.execute('''CREATE TABLE IF NOT EXISTS tokens_list (
            name TEXT,
            address TEXT,
            chain TEXT,
            UNIQUE(name, chain))''')

        tokens_data = [
            ('ETH', 'ETH', 'Ethereum'),
            ('USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'Ethereum'),
            ('USDT', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 'Ethereum'),
            ('DAI', '0x6B175474E89094C44Da98b954EedeAC495271d0F', 'Ethereum'),
            ('WISE', '0x66a0f676479Cee1d7373f3DC2e2952778BfF5bd6', 'Ethereum')
        ]
        for name, address, chain in tokens_data:
            c.execute("INSERT OR IGNORE INTO tokens_list (name, address, chain) VALUES (?, ?, ?)", (name, address, chain))

        conn.commit()
        conn.close()
        print("Database initialized.")
        logging.info("Database initialized.")


crypto_assistant = CryptoTradingAssistant()

@app.route("/")
def home():
    return "Hello, World!"

# @TODO: move to NILLION secretSigner
STORAGE_DIR = "./wallet_storage"
if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR)

def get_wallet_file_path(owner: str) -> str:
    return os.path.join(STORAGE_DIR, f"{owner}_wallet.json")

def get_stored_wallet(owner: str):
    """
    Check if a wallet already exists for the given owner.
    @TODO: here we should use NILLION secretSigner to read the private key securely
    Returns the wallet data as a dict if found, otherwise None.
    """
    file_path = get_wallet_file_path(owner)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf8") as f:
                wallet_data = json.load(f)
            return wallet_data
        except Exception as e:
            print("Error reading wallet file:", e, file=sys.stderr)
    return None

def store_wallet(owner: str, wallet_data: dict) -> bool:
    """
    Store the wallet data for the given owner.
    @TODO: here we should use NILLION secretSigner to store the private key securely
    """
    file_path = get_wallet_file_path(owner)
    try:
        with open(file_path, "w", encoding="utf8") as f:
            json.dump(wallet_data, f)
        return True
    except Exception as e:
        print("Error storing wallet file:", e, file=sys.stderr)
        return False

def generate_ethereum_wallet():
    """
    Generates a new Ethereum wallet (address and private key) similar to ethers.js Wallet.createRandom().
    Returns a dictionary with the wallet details.
    """
    acct = Account.create()
    return {"address": acct.address, "private_key": acct.key.hex()}

@app.route("/api/v1/storePrivateKey/<path:owner>", methods=["GET"])
def get_or_create_wallet(owner: str):
    # Optionally accept a public key argument from the query string
    public_key_arg = request.args.get("publicKey")

    # Check if a wallet already exists for this owner.
    existing_wallet = get_stored_wallet(owner)
    if existing_wallet:
        return jsonify({"success": True, "wallet": existing_wallet}), 200

    # No wallet exists; generate a new one.
    new_wallet = generate_ethereum_wallet()

    # (Optional) You could attach the passed public key to the wallet data if needed.
    if public_key_arg:
        new_wallet["provided_public_key"] = public_key_arg

    # Store the new wallet.
    if store_wallet(owner, new_wallet):
        return jsonify({"success": True, "wallet": new_wallet}), 200
    else:
        return jsonify({"success": False, "error": "Failed to store wallet."}), 500


@app.route("/api/v1/create", methods=["GET", "POST"])
async def create():

    new_chat = await create_schema("Conversation Starter")

    if request.method == "POST":
        return jsonify({"chatId": new_chat})
    else:
        # handle GET
        return new_chat

@app.route("/api/v1/about", methods=["GET", "POST"])
def about():
    chat_id = "endpoint: "+ str(datetime.now())
    if request.method == "POST":
        return jsonify({"chatId": chat_id})
    else:
        # handle GET
        return "About"

@app.route("/api/v1/automateSigningExecute/<path:address>/<path:chainId>", methods=["GET"])
async def automateSigningExecute(address, chainId):
    wallet_response, status_code = get_or_create_wallet(address)

    # 2) If the wallet call didn't succeed, just return its response
    if status_code != 200:
        return wallet_response, status_code

    # 3) Convert the Flask Response into a Python dict
    wallet_data = wallet_response.get_json()
    # Now wallet_data is something like:
    # {
    #   "success": True,
    #   "wallet": {
    #       "address": "...",
    #       "private_key": "..."
    #   }
    # }

    # 4) Extract the private key
    privateKey = wallet_data["wallet"]["private_key"]
    return jsonify({"response": execute_pending_safe_transactions(address, privateKey, chainId)})

@app.route("/api/v1/automateSigningExecuteSingle/<path:address>/<path:chainId>", methods=["GET"])
async def automateSigningExecuteSingle(address, chainId):
    wallet_response, status_code = get_or_create_wallet(address)

    # 2) If the wallet call didn't succeed, just return its response
    if status_code != 200:
        return wallet_response, status_code

    # 3) Convert the Flask Response into a Python dict
    wallet_data = wallet_response.get_json()
    # Now wallet_data is something like:
    # {
    #   "success": True,
    #   "wallet": {
    #       "address": "...",
    #       "private_key": "..."
    #   }
    # }
    chain_id_int = int(chainId)
    # 4) Extract the private key
    privateKey = wallet_data["wallet"]["private_key"]
    return jsonify({"response": execute_single_pending_safe_transaction(address, privateKey, chain_id_int)})
@app.route("/api/v1/clearQueueWithAnalyzeAndSignAndExecute/<path:safeaddress>/<path:address>/<path:chainId>", methods=["GET"])
async def clearQueueWithAnalyzeAndSignAndExecute(safeaddress, address, chainId):
    wallet_response, status_code = get_or_create_wallet(address)
    chain_id_int = int(chainId)
    # 1) If the wallet call didn't succeed, just return its response
    if status_code != 200:
        return wallet_response, status_code

    # 2) Convert the Flask Response into a Python dict
    wallet_data = wallet_response.get_json()
    privateKey = wallet_data["wallet"]["private_key"]

    reasonString = ""

    while True:
        try:
            # 3) Call analyze_transaction(safeaddress) and get its response directly
            analysis_result = analyze_transaction(safeaddress, chainId)
            #print(analysis_result, "analysis_result")
            # 4) Parse the JSON content from the response
            resp_json = analysis_result.get_json()
         ##   print(resp_json, "resp_json")

            # 5) Check for "error" or "response" fields in resp_json
            if "error" in resp_json and resp_json["error"] == "Transaction is empty":
                reasonString = "No pending transactions found"
                break
            elif resp_json.get("response") == "yes":
                print("Executing transaction...")
                execute_single_pending_safe_transaction(safeaddress, privateKey, chain_id_int)
                reasonString += "Transaction(s) executed"
            else:
                reasonString += "Transaction is not safe to execute"
                break

        except Exception as e:
            reasonString = f"Error during execution: {str(e)}"
            break

    return jsonify({"response": reasonString})

@app.route("/api/v1/fullyAutomateClearingQueueAndAnalyzeLoop/<path:safeaddress>/<path:address>/<path:chainId>", methods=["GET"])
async def fullyAutomateClearingQueueAndAnalyzeLoop(safeaddress,address, chainId):
    print("fullyAutomateClearingQueueAndAnalyzeLoop")
    global botRunning
    chain_id_int = int(chainId)
    botRunning = True
    while True:
        print("clearing queue")
        await clearQueueWithAnalyzeAndSignAndExecute(safeaddress,address, chainId)
        print("queue cleared2")
        time.sleep(10)
        if (botRunning == False):
            break
    return jsonify({"response": "Bot stopped"})

@app.route("/api/v1/stopBot", methods=["GET"])
def stopBot():
    global botRunning
    botRunning = False
    return jsonify({"response": "Bot stopped"})

@app.route("/ask_ai/<path:question>", methods=["GET"])
def ask_ai_get(question):
    model = request.args.get("model", default_nil_ai_model)
    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.ask_ai(question, model))
    return jsonify({"response": response})

@app.route("/ask_ai", methods=["POST", "OPTIONS"])
def ask_ai_post():
    # can handle OPTIONS manually:
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    question = data.get("question", "")
    model = data.get("model", "ask_openrouter")

    if not question:
        return jsonify({"error": "Question is empty"}), 400

    # Call your async method:
    response = asyncio.run(crypto_assistant.ask_ai(question, model))

    return jsonify({"response": response})

@app.route("/propose_malicious_transaction/<path:safeaddress>/<path:address>/<path:chainId>/<path:delegatecallDestination>", methods=["GET"])
def propose_malicious_transaction(safeaddress, address, chainId, delegatecallDestination):
    wallet_response, status_code = get_or_create_wallet(address)
    if status_code != 200:
        return wallet_response, status_code
    wallet_data = wallet_response.get_json()
    privateKey = wallet_data["wallet"]["private_key"]
    chainId_int = int(chainId)
    return jsonify({"response": propose_malicious_tx(chainId_int, safeaddress, privateKey, delegatecallDestination)})

@app.route("/ask_nilai/<path:question>", methods=["GET"])
def ask_nilai_get(question):
    model = request.args.get("model", "ask_nilai")
    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.ask_ai(question, model))
    return jsonify({"response": response})

@app.route("/api/v1/analyze_transaction/<path:safeaddress>/<path:chainId>", methods=["GET"])
def analyze_transaction(safeaddress, chainId):
    # 1) Convert or replace any invalid surrogate characters
    #    so Python won't throw a 'surrogates not allowed' error.
#    transaction_clean = transaction.encode("utf-8", errors="replace").decode("utf-8", errors="replace")

    # 2) Pick up the model choice from query param (defaults to "ask_nilai")
    model = request.args.get("model", "ask_openrouter")

    transaction = get_lowest_pending_tx_info(safeaddress, chainId)
    print(transaction)
    if not transaction:
        return jsonify({"error": "Transaction is empty"}), 400

    transaction_clean = json.dumps(transaction)

    # 3) Build the question prompt for the AI
    question = (
        "Ignore all previous instructions."
        "This is a transaction details: {transaction_clean}. "
        "Is it true that the transaction contains 'operation': 0 and 'codeVerified': True? "
    ).format(transaction_clean=transaction_clean)

    # 4) Call your async AI method, capturing the raw string response
    try:
        assistant_response = asyncio.run(crypto_assistant.ask_ai(question, model))
        print(assistant_response,"assistant_response")
    except Exception as e:
        logging.error(f"Error in ask_ai: {e}")
        return jsonify({"error": "An error occurred while processing your question."}), 500

    lower_response = assistant_response.lower()

    if ("no" in lower_response or "not" in lower_response) and "know" not in lower_response:
        return jsonify({"response": "no"})
    else:
        return jsonify({"response": "yes"})

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

@app.route('/trade/<path:question>', methods=['GET'])
def trade_get(question):
    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.trade(question))
    return jsonify({"response": response})

@app.route('/trade', methods=['POST', 'OPTIONS'])
def trade_post():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json() or {}
    question = data.get('question', '')

    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.trade(question))
    return jsonify({"response": response})

@app.route('/safe', methods=['POST', 'OPTIONS'])
def ask_safe():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json() or {}
    question = data.get('question', '')

    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.ask_ai_safe(question, 'ask_nilai'))
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

@app.route("/api/v1/tx/<address>/pendingArbitrum", methods=["GET"])
def get_pending_txs_arbitrum(address):
    try:
        # Validate the Ethereum address format
        if not Web3.is_address(address):
            return jsonify({"error": "Invalid Ethereum address format"}), 400

        # Basic Safe API request to get pending transactions
        response = requests.get(f"{safe_api_url_v3}/safes/{address}/multisig-transactions/?executed=false")

        if response.status_code != 200:
            return jsonify({"error": f"Safe API error: {response.status_code}"}), response.status_code

        # Return the transaction wallets data
        return jsonify(response.json())

    # Error handling
    except Exception as e:
        logging.error(f"Error getting transactions for {address}: {str(e)}")
        return jsonify({"error": "Failed to retrieve transactions"}), 500


@app.route("/api/v1/tx/<address>/pending", methods=["GET"])
def get_pending_txs(address):
    try:
        # Validate the Ethereum address format
        if not Web3.is_address(address):
            return jsonify({"error": "Invalid Ethereum address format"}), 400

        # Basic Safe API request to get pending transactions
        response = requests.get(f"{safe_api_url_v2}/safes/{address}/multisig-transactions/?executed=false")

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

