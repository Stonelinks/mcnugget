import os
import sys

MCNUGGET_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, MCNUGGET_DIR)

from mcnugget.server import start_server

if __name__ == '__main__':
    start_server()