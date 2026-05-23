from jinja2 import Environment, DictLoader
from flask import request, Flask

env = Environment(loader=DictLoader({"t": "Hello {{ name }}"}))
app = Flask(__name__)

@app.route("/hello")
def hello():
    name = request.args.get("name", "world")
    return env.get_template("t").render(name=name)
