#!/bin/bash
source venv/bin/activate || echo 'Failed to load venv'

export MCNUGGET_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
