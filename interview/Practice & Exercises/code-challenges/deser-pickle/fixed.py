import json
from flask import request, Flask
app = Flask(__name__)

@app.route("/load")
def load():
    data = request.get_data()
    # Safe: schema-bound JSON, not arbitrary object graphs
    obj = json.loads(data)
    if not isinstance(obj, dict):
        return "invalid", 400
    return str(obj.get("name", ""))
