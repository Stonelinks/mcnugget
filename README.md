# mcnugget
2d images to 3d models, no relation to mcnuggets

## setup
```
python3 -m venv venv
. devenv.sh
pip install -r requirements.txt
cd mcnugget/mcnugget-app/ && npm i
```

## development

backend
```
python -m mcnugget
```

frontend
```
cd mcnugget/mcnugget-app/ && npm start
```

## research
https://colmap.github.io/cli.html#cli
https://hub.docker.com/r/freakthemighty/openmvs/~/dockerfile/
https://github.com/rennu/dpg
https://grpc.io/docs/quickstart/python.html
https://stackoverflow.com/questions/13942069/flask-stream-output-of-function-to-browser


## testing

building
```
docker build --rm -f Dockerfile -t mcnugget:latest .
```

running in docker
```
docker run --rm -p 5000:5000 -v `pwd`:/mcnugget -it mcnugget:latest
cd /mcnugget && python3 -m mcnugget
```

```
colmap automatic_reconstructor --use_gpu 0 --dense 0 --num_threads 4 --workspace_path /test/tea --image_path /test/tea/images
colmap model_converter --input_path /test/tea/sparse/0 --output_path /test/tea/model.nvm --output_type NVM
/usr/local/bin/OpenMVS/InterfaceVisualSFM model.nvm
/usr/local/bin/OpenMVS/DensifyPointCloud model.mvs
/usr/local/bin/OpenMVS/ReconstructMesh model_dense.mvs
/usr/local/bin/OpenMVS/RefineMesh --resolution-level 1 model_dense_mesh.mvs
/usr/local/bin/OpenMVS/TextureMesh --export-type obj -o model.obj model_dense_mesh_refine.mvs
```

## license
GPLV3
