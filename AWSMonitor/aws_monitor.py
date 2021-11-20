from jupyter_server.base.handlers import JupyterHandler
import json
import tornado
import os
import re

home = os.getenv('HOME')
path = '/tmp/token_9238572973'

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
            self.reset_counters()
            nparts = body['npart']    
        if msg == 'INV':
            invoked = invoked + 1
        if msg == 'FIN':
            finished = finished + 1

        

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
        
        token_regex = re.search('token=(.+?) :', output)
        token = token_regex.group(1) if token_regex else None
        
        port_regex = re.search('https?://.+:(.+?)/[? ]', output)
        port = port_regex.group(1) if port_regex else None

        try:
            os.umask(0)
            with open(os.open(path, os.O_CREAT | os.O_WRONLY, 0o600), 'w') as f:
                f.write(token + '\n' + port)
        except FileNotFoundError as e:
            pass
        self.write(json.dumps({'status': 'OK'}))
        
    def reset_counters(self):
        global nparts
        global invoked
        global finished
        nparts = 0
        invoked = 0
        finished = 0
        print(finished, invoked)
