import subprocess
from flask import request, Flask
app = Flask(__name__)

@app.route("/ping")
def ping():
    host = request.args.get("host", "example.com")
    # BUG: shell injection via unsanitized host
    subprocess.call(f"ping -c 1 {host}", shell=True)
    return "ok"
