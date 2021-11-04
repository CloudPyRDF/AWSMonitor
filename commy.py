import concurrent.futures
import os
import random
import time
import requests
import json

path = '/tmp/token_9238572973'

with open(path, 'r') as f:
    token = f.read()

endpoint = 'http://localhost:8888/AWSMonitor'

START = lambda npart: requests.put(endpoint, params={'token': token}, data=json.dumps({'msg': 'START', 'npart': npart}))
FINISHED = lambda: requests.put(endpoint, params={'token': token}, data=json.dumps({'msg': 'INV'}))
INVOKED = lambda: requests.put(endpoint, params={'token': token}, data=json.dumps({'msg': 'FIN'}))

def lambda_sim(idx):
    t = random.randint(1, 10)

    INVOKED()

    time.sleep(t)

    FINISHED()

    return (t, idx, True)

def ProcessAndMerge(npart=32):
    START({'npart': npart})
    print("elo")
    with concurrent.futures.ThreadPoolExecutor(max_workers=npart) as ex:
        futures = [ex.submit(lambda_sim, i) for i in range(npart)]
        for future in concurrent.futures.as_completed(futures):
            print(future.result())


if __name__ == '__main__':
    ProcessAndMerge()