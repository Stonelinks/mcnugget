import os
import sys

ROOT_PATH = os.path.dirname(os.path.realpath(__file__))
APP_PATH = os.path.join(ROOT_PATH, 'mcnugget-app', 'build')

# various working directories
DATA_PATH = os.path.join(ROOT_PATH, 'data')
UPLOADS_PATH = os.path.join(DATA_PATH, '0_uploads')
PROCESSING_PATH = os.path.join(DATA_PATH, '1_processing')
DONE_PATH = os.path.join(DATA_PATH, '2_done')
for path in [DATA_PATH, UPLOADS_PATH, PROCESSING_PATH, DONE_PATH]:
    os.makedirs(path, exist_ok=True)
