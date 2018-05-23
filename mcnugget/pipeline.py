import os
import time
import subprocess
import multiprocessing
import datetime

from mcnugget.config import APP_PATH, DATA_PATH, UPLOADS_PATH, PROCESSING_PATH
from mcnugget.utils import timeit

NUM_THREADS = '4'
USE_GPU = '0'

@timeit
def _process(project_id):
    processing_path = os.path.join(PROCESSING_PATH, project_id)
    db_path = os.path.join(processing_path, 'database.db')
    image_list_path = os.path.join(processing_path, 'raw_images.txt')
    sparse_path = os.path.join(processing_path, 'sparse')
    sparse0_path = os.path.join(sparse_path, '0')
    os.makedirs(sparse_path, exist_ok=True)
    model_nvm_path = os.path.join(processing_path, 'model.nvm')
    model_mvs_path = os.path.join(processing_path, 'model.mvs')
    model_mvs_dense_path = os.path.join(processing_path, 'model_dense.mvs')
    model_mvs_dense_mesh_path = os.path.join(processing_path, 'model_dense_mesh.mvs')
    model_mvs_dense_mesh_refine_path = os.path.join(processing_path, 'model_dense_mesh_refine.mvs')
    now = datetime.datetime.now()
    unix_now = str(now.timestamp()).split('.')[0]
    human_now = now.strftime("%a-%d-%B-%Y-%I-%M-%S")
    log_file_name = "mcnugget-log-{0}-{1}.txt".format(unix_now, human_now)
    log = open(os.path.join(processing_path, log_file_name), 'a')
    log.write('starting log {}\n'.format(log_file_name))
    log.flush()

    def _Popen(args):
        print(args)
        proc = subprocess.Popen(args,
                                stdout=log, stderr=log, shell=True, cwd=processing_path)
        proc.wait()

    def colmap(cmd):
        _Popen(['colmap {}'.format(cmd)])

    def open_mvs(cmd, args):
        _Popen(['/usr/local/bin/OpenMVS/{0} --max-threads {1} {2}'.format(cmd, NUM_THREADS, args)])

    # extract features
    _Popen(['colmap feature_extractor --database_path {0} --image_path {1} --image_list_path {2} --ImageReader.single_camera 1 --SiftExtraction.num_threads {3} --SiftExtraction.use_gpu {4}'.format(db_path, processing_path, image_list_path, NUM_THREADS, USE_GPU)])
    
    # match
    colmap('spatial_matcher --database_path {0} --SiftMatching.num_threads {1} --SiftMatching.use_gpu {2}'.format(db_path, NUM_THREADS, USE_GPU))

    # export sparse
    colmap('mapper --database_path {0} --image_path {1} --image_list_path {2} --Mapper.num_threads {3} --export_path {4}'.format(db_path, processing_path, image_list_path, NUM_THREADS, sparse_path))

    # convert to nvm, import to openmvs
    colmap('model_converter --input_path {0} --output_path {1} --output_type NVM'.format(sparse0_path, model_nvm_path))

    open_mvs('InterfaceVisualSFM', model_nvm_path)
    open_mvs('DensifyPointCloud', model_mvs_path)
    open_mvs('ReconstructMesh', model_mvs_dense_path)
    open_mvs('RefineMesh', '--resolution-level 1 {}'.format(model_mvs_dense_mesh_path))
    open_mvs('TextureMesh', '--export-type obj -o model.obj {}'.format(model_mvs_dense_mesh_refine_path))

    log.close()


def make_happy_meal(project_id):
    background_process = multiprocessing.Process(
        target=_process, args=([project_id]), daemon=True)
    background_process.start()
    print('Started: ' + str(background_process.pid))
