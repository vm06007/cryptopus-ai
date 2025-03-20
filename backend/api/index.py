import os
import certifi
os.environ['SSL_CERT_FILE'] = certifi.where()
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask import request

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

if __name__ == "__main__":
    app.run()


