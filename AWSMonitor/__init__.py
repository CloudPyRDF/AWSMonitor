

from IPython import get_ipython
from ipykernel.comm import Comm

#from .aws_monitor import MonitorHandler
from aws_monitor import load_ipython_extension


def _jupyter_server_extension_points():
    comm = Comm(target_name='test')
    comm.send({"msg": "c4"})
    f = open("$HOME/xssssssss.txt", "w")
    f.write("elo")
    f.close()

    return [{
        "module": "AWSMonitor"
    }]

def _load_jupyter_server_extension(server_app):
    #handlers = [("/AWSMonitor", MonitorHandler)]
    #server_app.web_app.add_handlers(".*$", handlers)
    comm = Comm(target_name='test')
    comm.send({"msg": "c5"})
    f = open("$HOME/xdd.txt", "w")

    f.write("elo")
    f.close()
    load_ipython_extension(get_ipython())

