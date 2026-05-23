import subprocess
import re
from flask import request, Flask
app = Flask(__name__)

HOST_RE = re.compile(r"^[a-zA-Z0-9.-]+$")

@app.route("/ping")
def ping():
    host = request.args.get("host", "example.com")
    if not HOST_RE.match(host):
        return "invalid host", 400
    subprocess.run(["ping", "-c", "1", host], check=False)
    return "ok"
