
marker=#MONITOR

#TODO: make independent
root_path=/usr/local/lib/root/
aws_path=/DistRDF/Backends/AWS/

main_file=Backend.py
lambda_file=AWS_utils.py

main_path=${root_path}${aws_path}${main_file}
lambda_path=${root_path}${aws_path}${lambda_file}

if [ "$(tail -n 1 ${main_path})" != "${marker}" ]
then
    echo "
${marker}
from ipykernel.comm import Comm
comm = Comm(target_name=\"info\")

AWS.__ProcessAndMerge = AWS.ProcessAndMerge
def __ProcessAndMerge(self, ranges, mapper, reducer):
    comm.send({'msg': 'START', 'npart': len(ranges)})
    return self.__ProcessAndMerge(ranges, mapper, reducer)
AWS.ProcessAndMerge = __ProcessAndMerge
${marker}" >> $main_path
fi

if [ "$(tail -n 1 ${lambda_path})" != "${marker}" ]
then
    echo "
${marker}
from ipykernel.comm import Comm
comm = Comm(target_name=\"info\")

AWSServiceWrapper.__invoke_root_lambda = AWSServiceWrapper.invoke_root_lambda
def __invoke_root_lambda(self, *args, **kwargs):
    comm.send({'msg': 'INV'})
    retval = self.__invoke_root_lambda(*args, **kwargs)
    comm.send({'msg': 'FIN'})
    return retval
AWSServiceWrapper.invoke_root_lambda = __invoke_root_lambda
${marker}" >> $lambda_path
fi

