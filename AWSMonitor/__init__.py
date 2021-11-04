import requests
from notebook.utils import url_path_join
from tornado.escape import json_encode
from tornado.httpclient import AsyncHTTPClient

import os


from .aws_monitor import MonitorHandler

def _jupyter_server_extension_points():
    return [{
        "module": "AWSMonitor"
    }]

def load_jupyter_server_extension(server_app):
    handlers = [("/AWSMonitor", MonitorHandler)]
    server_app.web_app.add_handlers(".*$", handlers)




