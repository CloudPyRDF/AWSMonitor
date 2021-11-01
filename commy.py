import concurrent.futures
import random
import time
from ipykernel.comm import Comm

comm = Comm(target_name='info')

START = lambda npart: comm.send(data={'msg': 'START', 'npart': npart})
FINISHED = lambda: comm.send({'msg': 'FIN'})
INVOKED = lambda: comm.send({'msg': 'INV'})

def lambda_sim(idx):
    t = random.randint(1, 10)

    INVOKED()

    time.sleep(t)

    FINISHED()

    return (t, idx, True)

def ProcessAndMerge(npart=32):
    START({'npart': npart})

    with concurrent.futures.ThreadPoolExecutor(max_workers=npart) as ex:
        futures = [ex.submit(lambda_sim, i) for i in range(npart)]
        for future in concurrent.futures.as_completed(futures):
            print(future.result())


if __name__ == '__main__':
    ProcessAndMerge()