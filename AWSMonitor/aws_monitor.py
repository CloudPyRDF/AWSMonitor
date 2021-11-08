from ipykernel.comm import Comm
from jupyter_server.base.handlers import JupyterHandler
import json
import tornado
import os
import pathlib

home = os.getenv('HOME')

invoked = 0
finished = 0
nparts = 0


class MonitorHandler(JupyterHandler):
    @tornado.web.authenticated
    def put(self):
        global nparts
        global invoked
        global finished
        body = self.get_json_body()
        msg = body['msg']
        if msg == 'START':
            nparts = body['npart']
        if msg == 'INV':
            invoked = invoked + 1
        if msg == 'FIN':
            finished = finished + 1

        print(finished, invoked)

        self.write(json.dumps({'status': 'OK'}))


    @tornado.web.authenticated
    def get(self):
        global nparts
        global invoked
        global finished
        self.write(json.dumps({
            'npart': nparts,
            'FIN': finished,
            'INV': invoked
        }))


    @tornado.web.authenticated
    def post(self):
        stream = os.popen('jupyter server list')
        output = stream.read()
        print(output)
        if 'token' not in output:
            self.write(json.dumps({'status': 'Failed'}))
            return
        try:
            #pathlib.Path(home + '/.notebook_metadata').mkdir(exist_ok=True)
            with open('/tmp/token_9238572973', 'w') as f:
                f.write(output.split("=")[1].split(":")[0][:-1])
        except FileNotFoundError as e:
            pass
        self.write(json.dumps({'status': 'OK'}))

