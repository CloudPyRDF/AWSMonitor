aws_path=/DistRDF/Backends/AWS/

main_file=Backend.py
lambda_file=AWS_utils.py

main_path=${root_path}${aws_path}${main_file}
lambda_path=${root_path}${aws_path}${lambda_file}

if [ "$(tail -n 1 ${main_path})" != "${marker}" ]
then
    echo "
${marker}
import requests
import json

with open('/tmp/token_9238572973', 'r') as f:
    lines = f.read().splitlines()
    ___token = lines[0]
    ___port = lines[1]

AWS.__ProcessAndMerge = AWS.ProcessAndMerge
def __ProcessAndMerge(self, ranges, mapper, reducer):
    requests.put('http://localhost:' + ___port + '/AWSMonitor', params={'token': ___token}, data=json.dumps({'msg': 'START', 'npart': len(ranges)}))
    return self.__ProcessAndMerge(ranges, mapper, reducer)
AWS.ProcessAndMerge = __ProcessAndMerge
${marker}" >> $main_path
fi

if [ "$(tail -n 1 ${lambda_path})" != "${marker}" ]
then
    echo "
${marker}
import requests
import json

with open('/tmp/token_9238572973', 'r') as f:
    lines = f.read().splitlines()
    ___token = lines[0]
    ___port = lines[1]

AWSServiceWrapper.__invoke_root_lambda = AWSServiceWrapper.invoke_root_lambda
def __invoke_root_lambda(self, *args, **kwargs):
    requests.put('http://localhost:' + ___port + '/AWSMonitor', params={'token': ___token}, data=json.dumps({'msg': 'INV'}))
    retval = self.__invoke_root_lambda(*args, **kwargs)
    requests.put('http://localhost:' + ___port + '/AWSMonitor', params={'token': ___token}, data=json.dumps({'msg': 'FIN'}))
    return retval
AWSServiceWrapper.invoke_root_lambda = __invoke_root_lambda
${marker}" >> $lambda_path
fi
