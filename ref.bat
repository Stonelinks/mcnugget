::These parameters are specific to computer

::Store current Directory:
set currDir=%CD%

::get folder name as variable
SET "MYDIR=%~p0"
set MYDIR1=%MYDIR:~0,-1%
for %%f in (%MYDIR1%) do set myfolder=%%~nxf

:: Set colmap directory (change this to where you've downloaded colmap):
set colDir=C:/Users/Peter/Downloads/COLMAP-3.4-windows/bin/colmap

:: Set openMVS directory (change this to where you've downloaded openMVS)
set oMVS=C:/Users/Peter/Downloads/openMVS_sample-0.7a

:: Set Working Directory (I create a temporary folder on my D drive to process data in)
set workDir=D:/%myfolder%/

mkdir %workDir% 
copy *.jpg %workDir%/ 
cd /d %workDir%

colmap feature_extractor --database_path database.db --image_path .
colmap exhaustive_matcher --database_path database.db
mkdir sparse
colmap mapper --database_path %workDir%/database.db --image_path . --export_path %workDir%/sparse
colmap model_converter --input_path sparse/0 --output_path model.nvm --output_type NVM
openmvs/InterfaceVisualSFM model.nvm
openmvs/DensifyPointCloud model.mvs
openmvs/ReconstructMesh model_dense.mvs
openmvs/RefineMesh --resolution-level 1 model_dense_mesh.mvs
openmvs/TextureMesh --export-type obj -o myfolder%.obj model_dense_mesh_refine.mvs

mkdir %currDir%/model/
copy *.obj %currDir%/model/
copy *.mtl %currDir%/model/
copy *Kd.jpg %currDir%/model/

cd %currDir%

::If you want to automate removal of the working folder, use the following line.
::Don't use it if you want to keep intermediate steps.
rmdir /S /Q %workDir%