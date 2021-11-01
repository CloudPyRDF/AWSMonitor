from jupyter_server.extension.application import ExtensionApp
from ipykernel.comm import Comm

class AWSMonitorExtensionAPP(ExtensionApp):
    name = "AWSMonitor"
    default_url = "/AWSMonitor"
    load_other_extensions = True
    file_url_prefix = "/render"

    # --- ExtensionApp traits you can configure ---
    static_paths = [...]
    template_paths = [...]
    settings = {...}
    handlers = [...]

    # ----------- add custom traits below ---------
    ...

    def initialize_settings(self):
        comm = Comm(target_name='test')
        comm.send({"msg": "c3"})
        f = open("$HOME/xssssssss.txt", "w")
        f.write("elo")
        f.close()

        # Update the self.settings trait to pass extra
        # settings to the underlying Tornado Web Application.
        #self.settings.update({'<trait>': ...})