import pickle
from flask import request, Flask
app = Flask(__name__)

@app.route("/load")
def load():
    data = request.get_data()
    # BUG: pickle loads attacker-controlled bytes → RCE
    obj = pickle.loads(data)
    return str(obj)
