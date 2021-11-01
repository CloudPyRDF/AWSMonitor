import logging
from ipykernel.comm import Comm

logger = logging.getLogger("AWSMonitor")
comm = Comm(target_name='test')

def load_ipython_extension(ipython):
    comm.send({"msg": "2"})
    ipython.kernel.comm_manager.register_target(
        "info", target_func)


def target_func(comm, msg):
    """Callback function to be called when a frontend comm is opened"""

    @comm.on_msg
    def _recv(msg):
        handle_comm_message(msg)


def handle_comm_message(msg):
    comm.send({"msg": "c"})
    print("lel")
    logger.warning("warning")
