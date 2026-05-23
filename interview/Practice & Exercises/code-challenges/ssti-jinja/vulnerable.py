from jinja2 import Template
from flask import request, Flask
app = Flask(__name__)

@app.route("/hello")
def hello():
    name = request.args.get("name", "world")
    # BUG: user input in template source → SSTI
    return Template("Hello " + name).render()
